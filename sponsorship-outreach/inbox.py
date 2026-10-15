"""IMAP inbox monitor for partnership@toolverai.com.

Classifies every new message (by UID cursor — never marks mail as read):
  bounce      → status BOUNCED, address suppressed
  auto-reply  → logged only (out-of-office does not stop the follow-up)
  opt-out     → status OPTED_OUT, address suppressed
  positive    → status HOT_LEAD, pricing + GA4 proof reply saved to Drafts
  other human → status REPLIED (manual review), follow-ups stop
"""
from __future__ import annotations

import email
import imaplib
import re
from datetime import datetime, timedelta
from email.header import decode_header, make_header
from email.message import Message
from email.utils import getaddresses, parseaddr
from typing import Callable

from bs4 import BeautifulSoup

import store as st
from config import DRAFTS_DIR, GA4_PROOF_PATH, Settings
from mailer import Mailer, build_message
from templates import hot_lead_reply

BOUNCE_FROM = re.compile(r"^(mailer-daemon|postmaster|mail-daemon|bounce|bounces)\b", re.I)
BOUNCE_SUBJECT = re.compile(
    r"(undeliver|delivery status notification|delivery (has )?failed|mail delivery failed|returned mail|"
    r"failure notice|could not be delivered|address not found|message not delivered)", re.I)
AUTO_SUBJECT = re.compile(
    r"(out of (the )?office|automatic reply|auto[- ]?reply|autoreply|auto[- ]?response|away from|on vacation|"
    r"on leave|abwesend|absence|we('ve| have) received your|thank you for (contacting|reaching|your (email|message))|"
    r"ticket (#|received|created)|request received)", re.I)
OPT_OUT = re.compile(
    r"\b(unsubscribe|remove (me|us)|opt[- ]?out|stop (emailing|contacting|sending)|do not (contact|email)|"
    r"don'?t (contact|email)|not interested|no,? thanks|no thank you|take (me|us) off|please stop)\b", re.I)
POSITIVE = re.compile(
    r"\b(interested|pricing|prices?|rates?|costs?|how much|packages?|media ?kit|rate ?card|stats|traffic|"
    r"tell me more|more (info|details|information)|sounds (good|great|interesting)|let'?s (talk|chat|connect)|"
    r"(book|schedule|hop on) a call|send (it|them|over|me)|happy to|would love|keen|yes)\b", re.I)
QUOTE_CUT = re.compile(
    r"(^On .{0,200}wrote:\s*$|^-{2,}\s*Original Message\s*-{2,}|^_{5,}|^From:\s.+$|^Sent from my |"
    r"^Le .{0,200}a écrit\s*:|^Am .{0,200}schrieb)", re.I | re.M)


def _decode(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return value


def _body_text(msg: Message) -> str:
    plain, html = [], []
    for part in msg.walk() if msg.is_multipart() else [msg]:
        if part.get_content_disposition() == "attachment":
            continue
        ctype = part.get_content_type()
        if ctype not in ("text/plain", "text/html"):
            continue
        try:
            payload = part.get_payload(decode=True) or b""
            text = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
        except Exception:
            continue
        (plain if ctype == "text/plain" else html).append(text)
    if plain:
        return "\n".join(plain)
    return BeautifulSoup("\n".join(html), "html.parser").get_text("\n") if html else ""


def strip_quoted(text: str) -> str:
    m = QUOTE_CUT.search(text)
    if m:
        text = text[: m.start()]
    return "\n".join(line for line in text.splitlines() if not line.lstrip().startswith(">")).strip()


def _failed_recipients(msg: Message, raw_text: str) -> list[str]:
    failed: list[str] = []
    for part in msg.walk():
        if part.get_content_type() == "message/delivery-status":
            blob = part.as_string()
            for block in re.split(r"\n\s*\n", blob):
                rcpt = re.search(r"(?:Final|Original)-Recipient:\s*rfc822;\s*<?([^\s>]+)", block, re.I)
                action = re.search(r"Action:\s*(\w+)", block, re.I)
                status = re.search(r"Status:\s*(\d)\.", block, re.I)
                if rcpt and (not action or action.group(1).lower() == "failed") and (not status or status.group(1) == "5"):
                    failed.append(rcpt.group(1).lower())
    if not failed:
        failed = [e.lower() for e in re.findall(r"[\w.+\-]+@[\w\-]+\.[\w.\-]+", raw_text)]
    return list(dict.fromkeys(failed))


def _is_soft_bounce(msg: Message) -> bool:
    for part in msg.walk():
        if part.get_content_type() == "message/delivery-status":
            blob = part.as_string()
            if re.search(r"Action:\s*delayed", blob, re.I) or (
                    re.search(r"Status:\s*4\.", blob) and not re.search(r"Status:\s*5\.", blob)):
                return True
    return False


class InboxMonitor:
    def __init__(self, s: Settings, store: st.Store, mailer: Mailer, notify: Callable[[str, str], None]):
        self.s, self.store, self.mailer, self.notify = s, store, mailer, notify

    def _since_date(self) -> str:
        dates = [m["sent_at"] for r in self.store.tools.values() for m in r.get("messages", []) if m.get("sent_at")]
        start = min(dates)[:10] if dates else (datetime.now() - timedelta(days=14)).strftime("%Y-%m-%d")
        return datetime.strptime(start, "%Y-%m-%d").strftime("%d-%b-%Y")

    def run_once(self, verbose: bool = True) -> dict:
        stats = {"checked": 0, "bounce": 0, "auto": 0, "opt_out": 0, "hot": 0, "replied": 0, "unmatched": 0}
        conn = self.mailer.imap()
        try:
            typ, data = conn.select("INBOX", readonly=True)
            uidvalidity = None
            resp = conn.response("UIDVALIDITY")[1]
            if resp and resp[0]:
                uidvalidity = int(resp[0])
            cursor = self.store.data.setdefault("imap", {})
            if cursor.get("uidvalidity") != uidvalidity:
                cursor.clear()
                cursor["uidvalidity"] = uidvalidity
                cursor["last_uid"] = 0
            last_uid = int(cursor.get("last_uid", 0))

            typ, data = conn.uid("search", None, "SINCE", self._since_date())
            uids = [int(u) for u in (data[0] or b"").split() if int(u) > last_uid]
            for uid in sorted(uids):
                typ, msg_data = conn.uid("fetch", str(uid), "(BODY.PEEK[])")
                raw = next((p[1] for p in msg_data if isinstance(p, tuple)), None)
                if raw:
                    stats["checked"] += 1
                    kind = self._handle(email.message_from_bytes(raw), verbose)
                    stats[kind] = stats.get(kind, 0) + 1
                cursor["last_uid"] = uid
                self.store.save()
        finally:
            try:
                conn.logout()
            except Exception:
                pass
        return stats

    # ── classification ───────────────────────────────────────────────────────
    def _handle(self, msg: Message, verbose: bool) -> str:
        from_name, from_addr = parseaddr(_decode(msg.get("From")))
        from_addr = from_addr.lower()
        subject = _decode(msg.get("Subject"))
        if from_addr == self.s.sender_email.lower():
            return "unmatched"
        raw_text = _body_text(msg)

        # 1. Bounces
        is_report = msg.get_content_type() == "multipart/report"
        if BOUNCE_FROM.match(from_addr.split("@")[0]) or is_report or BOUNCE_SUBJECT.search(subject):
            if _is_soft_bounce(msg):
                return "auto"
            hit = False
            for rcpt in _failed_recipients(msg, raw_text):
                key = self.store.find_by_email(rcpt)
                if key:
                    hit = True
                    self.store.suppress(rcpt, "hard bounce")
                    self.store.set_status(key, st.BOUNCED, f"bounce: {rcpt}")
                    self.notify(key, f"bounced ({rcpt}) — address suppressed")
                    if verbose:
                        print(f"  ❌ Bounce → {key} ({rcpt})")
            return "bounce" if hit else "unmatched"

        # Match to a tool
        refs = re.findall(r"<[^>]+>", f"{msg.get('In-Reply-To', '')} {msg.get('References', '')}")
        key = (self.store.find_by_message_id(refs) or self.store.find_by_email(from_addr)
               or self.store.find_by_domain(from_addr.split("@")[-1]))
        if not key:
            return "unmatched"
        rec = self.store.tools[key]

        # 2. Auto-replies / OOO
        auto_hdr = (msg.get("Auto-Submitted", "no").lower() != "no" or msg.get("X-Autoreply") or
                    msg.get("X-Autorespond") or (msg.get("Precedence", "").lower() in ("auto_reply", "bulk", "junk")))
        if auto_hdr or AUTO_SUBJECT.search(subject):
            self.store.log_event(key, "auto_reply", subject[:120])
            if verbose:
                print(f"  🤖 Auto-reply → {key}: {subject[:60]}")
            return "auto"

        reply_text = strip_quoted(raw_text)
        reply_entry = {"at": st.now_iso(), "from": from_addr, "subject": subject,
                       "message_id": msg.get("Message-ID", ""), "snippet": reply_text[:500]}
        rec.setdefault("replies", []).append(reply_entry)

        # 3. Opt-out (checked before positive: "not interested" contains "interested")
        if OPT_OUT.search(reply_text):
            self.store.suppress(from_addr, "opt-out reply")
            if rec.get("contact", {}) and rec["contact"].get("email"):
                self.store.suppress(rec["contact"]["email"], "opt-out reply")
            self.store.set_status(key, st.OPTED_OUT, f"opt-out from {from_addr}")
            self.notify(key, f"opted out ({from_addr}) — no further emails")
            if verbose:
                print(f"  🚫 Opt-out → {key}")
            return "opt_out"

        # 4. Positive → Hot lead + draft
        if POSITIVE.search(reply_text):
            draft_info = self._draft_hot_reply(key, rec, msg, from_name, from_addr, subject)
            self.store.set_status(key, st.HOT_LEAD, f"reply from {from_addr}")
            self.notify(key, f"🔥 Hot Lead — {from_addr} replied; pricing draft {draft_info}")
            if verbose:
                print(f"  🔥 HOT LEAD → {key} ({from_addr}) — draft {draft_info}")
            return "hot"

        # 5. Neutral human reply
        self.store.set_status(key, st.REPLIED, f"reply from {from_addr}")
        self.notify(key, f"replied ({from_addr}) — review manually")
        if verbose:
            print(f"  💬 Reply → {key} ({from_addr}) — needs manual review")
        return "replied"

    def _draft_hot_reply(self, key: str, rec: dict, msg: Message, from_name: str, from_addr: str,
                         subject: str) -> str:
        first = from_name.split()[0] if from_name and re.match(r"^[A-Za-z][a-z]+", from_name.split()[0]) else ""
        has_proof = GA4_PROOF_PATH.exists()
        subj, body = hot_lead_reply(rec.get("tool_name", key), rec.get("live_page", ""), self.s, subject,
                                    has_proof, first)
        their_id = msg.get("Message-ID", "")
        refs = re.findall(r"<[^>]+>", msg.get("References", "")) + ([their_id] if their_id else [])
        draft = build_message(self.s, from_addr, subj, body, in_reply_to=their_id, references=refs,
                              attachment=GA4_PROOF_PATH if has_proof else None)
        DRAFTS_DIR.mkdir(exist_ok=True)
        local = DRAFTS_DIR / f"{key}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.eml"
        local.write_bytes(draft.as_bytes())
        where = f"saved locally ({local.name})"
        try:
            self.mailer.append(draft, "drafts")
            where = "saved to mailbox Drafts"
        except (imaplib.IMAP4.error, OSError) as exc:
            print(f"      (Drafts append failed, kept local copy: {exc})")
        rec["hot_lead_draft"] = {"at": st.now_iso(), "file": local.name, "has_ga4_proof": has_proof}
        return where + ("" if has_proof else " — ⚠ GA4 screenshot missing")
