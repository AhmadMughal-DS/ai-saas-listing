"""ToolverAI Sponsorship & Partnership Outreach — command-line entry point.

    python outreach.py check                 # verify SMTP, IMAP, Sheet, DNS, assets
    python outreach.py sync                  # load the 120 tools from the Google Sheet
    python outreach.py discover --limit 10   # find + verify contacts
    python outreach.py preview --tool devin  # render emails to previews/ (nothing sent)
    python outreach.py send --test-to me@x   # send ONE sample to yourself
    python outreach.py send --live --limit 5 # real initial emails (3–5 min apart)
    python outreach.py followup --live       # day-3 business-day follow-ups
    python outreach.py monitor               # one inbox pass (bounces / replies / hot leads)
    python outreach.py run --live            # continuous: monitor + send + follow-up
    python outreach.py status                # pipeline summary

Nothing is ever emailed to a prospect without the explicit --live flag.
"""
from __future__ import annotations

import argparse
import random
import socket
import sys
import time
from collections import Counter
from datetime import date, datetime, timedelta

import store as st
from config import GA4_PROOF_PATH, PREVIEW_DIR, Settings, load_settings
from contacts import ContactFinder, base_domain
from inbox import InboxMonitor
from mailer import Mailer, build_message
from sheet import Sheet, ToolRow
from templates import followup_email, initial_email
from videos import VideoMatcher


# ─── helpers ─────────────────────────────────────────────────────────────────
def business_days_since(iso_ts: str) -> int:
    start = datetime.fromisoformat(iso_ts).astimezone().date()
    today = date.today()
    days, d = 0, start
    while d < today:
        d += timedelta(days=1)
        if d.weekday() < 5:
            days += 1
    return days


def tool_from_record(rec: dict) -> ToolRow:
    return ToolRow(
        row_number=rec.get("row_number", 0), name=rec["tool_name"], category=rec.get("category", ""),
        traffic=rec.get("traffic", ""), website=rec.get("website", ""), live_page=rec.get("live_page", ""),
        deal=rec.get("deal", ""), features=rec.get("features", []), caption=rec.get("caption", ""),
        video_url=rec.get("video_url", ""), notes="",
    )


class App:
    def __init__(self, settings: Settings, live: bool = False):
        self.s = settings
        self.live = live
        self.store = st.Store()
        self._sheet: Sheet | None = None
        self._mailer: Mailer | None = None

    @property
    def sheet(self) -> Sheet:
        if self._sheet is None:
            self._sheet = Sheet(self.s)
        return self._sheet

    @property
    def mailer(self) -> Mailer:
        if self._mailer is None:
            self._mailer = Mailer(self.s)
        return self._mailer

    def notify(self, key: str, text: str) -> None:
        """Mirror the latest status into Google Sheet CRM and append to Activity History."""
        rec = self.store.tools.get(key, {})
        label = st.STATUS_LABEL.get(rec.get("status", ""), rec.get("status", ""))
        note = f"{label} · {datetime.now().strftime('%Y-%m-%d %H:%M')} · {text}"
        rec["sheet_note"] = note
        tool_name = rec.get("tool_name", key)
        email = (rec.get("contact") or {}).get("email", "")

        # 1. Update source sheet notes column if row_number exists
        if rec.get("row_number"):
            try:
                self.sheet.write_note(rec["row_number"], note)
            except Exception:
                pass

        # 2. Append event to Tab 2 of the dedicated tracking sheet
        try:
            self.sheet.record_activity(tool_name, label, email, rec.get("last_subject", ""), text)
        except Exception as exc:
            print(f"      (activity log notice: {exc})")

    # ── sync ─────────────────────────────────────────────────────────────────
    def sync(self) -> list[str]:
        tools = self.sheet.read_tools()
        vm = VideoMatcher(self.s)
        vm.load()
        print(f"[*] Sheet rows: {len(tools)} · YouTube: {vm.status}")
        keys = []
        for t in tools:
            video = vm.match(t.name, t.video_url)
            rec = self.store.upsert_tool(t.key, {
                "tool_name": t.name, "row_number": t.row_number, "category": t.category, "traffic": t.traffic,
                "website": t.website, "domain": t.domain, "live_page": t.live_page, "deal": t.deal,
                "features": t.features, "caption": t.caption, "video_url": video,
            })
            if rec["status"] == st.PENDING:
                if not t.website or not t.domain:
                    self.store.set_status(t.key, st.SKIPPED, "no official website in sheet")
                elif base_domain(t.domain) in self.s.exclude_domains:
                    self.store.set_status(t.key, st.SKIPPED, f"excluded domain {t.domain}")
            keys.append(t.key)
        self.store.save()
        c = Counter(self.store.tools[k]["status"] for k in keys)
        print(f"[✓] Synced {len(keys)} tools · " + ", ".join(f"{st.STATUS_LABEL[s]}: {n}" for s, n in c.items()))
        return keys

    # ── discover ─────────────────────────────────────────────────────────────
    def discover(self, limit: int, only: str = "", retry: bool = False) -> None:
        finder = ContactFinder(self.s)
        statuses = {st.PENDING} | ({st.NEEDS_REVIEW} if retry else set())
        todo = [k for k, r in self.store.tools.items() if r["status"] in statuses and (not only or k == only)]
        print(f"[*] Discovering contacts for {min(limit, len(todo))} of {len(todo)} tools...")
        for i, key in enumerate(todo[:limit], 1):
            rec = self.store.tools[key]
            print(f"  [{i}] {rec['tool_name']} ({rec['domain']})")
            try:
                contact, why = finder.find(rec["domain"], rec["website"], rec.get("contact"), tool_name=rec.get("tool_name", ""))
            except Exception as exc:
                contact, why = None, f"error: {exc}"
            if contact and self.store.is_suppressed(contact.email):
                contact, why = None, f"{contact.email} is suppressed"
            if contact:
                rec["contact"] = contact.to_dict() | {"verified_at": st.now_iso()}
                self.store.set_status(key, st.READY, why)
                print(f"      ✅ {contact.email} · {why} · confidence={contact.confidence}")
            else:
                self.store.set_status(key, st.NEEDS_REVIEW, why)
                print(f"      🔍 {why}")
            self.store.save()

    # ── preview ──────────────────────────────────────────────────────────────
    def preview(self, limit: int, only: str = "") -> None:
        PREVIEW_DIR.mkdir(exist_ok=True)
        keys = [k for k in self.store.tools if not only or k == only][:limit]
        for key in keys:
            rec = self.store.tools[key]
            subject, body = initial_email(tool_from_record(rec), self.s, rec.get("video_url", ""))
            to = (rec.get("contact") or {}).get("email", "<contact not discovered yet>")
            text = f"To: {to}\nSubject: {subject}\n\n{body}"
            (PREVIEW_DIR / f"{key}.txt").write_text(text, encoding="utf-8")
        if keys:
            print((PREVIEW_DIR / f"{keys[0]}.txt").read_text(encoding="utf-8"))
            print(f"[✓] {len(keys)} preview(s) written to {PREVIEW_DIR}")

    # ── sending ──────────────────────────────────────────────────────────────
    def _can_send(self) -> bool:
        return self.store.sent_today() < self.s.daily_limit

    def _deliver(self, key: str, kind: str, subject: str, body: str, in_reply_to: str = "",
                 refs: list[str] | None = None) -> bool:
        rec = self.store.tools[key]
        to = rec["contact"]["email"]
        if self.store.is_suppressed(to):
            self.store.set_status(key, st.OPTED_OUT, f"{to} suppressed")
            return False
        msg = build_message(self.s, to, subject, body, in_reply_to=in_reply_to, references=refs)
        if not self.live:
            print(f"  [dry-run] {kind} → {to} · {subject}")
            return False
        try:
            self.mailer.send(msg)
        except Exception as exc:
            # Recipient refused at SMTP time = hard failure; suppress immediately
            text = str(exc)
            if "Recipients" in type(exc).__name__ or " 55" in text:
                self.store.suppress(to, f"smtp refused: {text[:120]}")
                self.store.set_status(key, st.BOUNCED, text[:200])
                self.notify(key, f"SMTP refused {to}")
            print(f"  ❌ {kind} → {to} failed: {exc}")
            self.store.save()
            return False
        rec["last_subject"] = subject
        rec["messages"].append({"type": kind, "message_id": msg["Message-ID"], "to": to,
                                "subject": subject, "sent_at": st.now_iso()})
        self.store.count_send()
        self.store.set_status(key, st.SENT if kind == "initial" else st.FOLLOWED_UP, f"{kind} → {to}")
        self.notify(key, f"{kind} email sent to {to}")
        self.store.save()
        print(f"  📤 {kind} → {to} ({rec['tool_name']}) · today {self.store.sent_today()}/{self.s.daily_limit}")
        return True

    def due_followups(self) -> list[str]:
        if not getattr(self.s, "send_followups", False):
            return []  # follow-ups disabled: each tool gets exactly one email
        due = []
        for key, rec in self.store.tools.items():
            if rec["status"] != st.SENT or rec.get("replies"):
                continue
            initial = next((m for m in rec["messages"] if m["type"] == "initial"), None)
            if initial and business_days_since(initial["sent_at"]) >= self.s.followup_business_days:
                due.append(key)
        return due

    def send_followup(self, key: str) -> bool:
        rec = self.store.tools[key]
        initial = next(m for m in rec["messages"] if m["type"] == "initial")
        subject, body = followup_email(tool_from_record(rec), self.s, initial["subject"])
        return self._deliver(key, "followup", subject, body, initial["message_id"], [initial["message_id"]])

    def send_initial(self, key: str) -> bool:
        rec = self.store.tools[key]
        subject, body = initial_email(tool_from_record(rec), self.s, rec.get("video_url", ""))
        return self._deliver(key, "initial", subject, body)

    def _pause(self, monitor: InboxMonitor | None = None) -> None:
        wait = random.randint(self.s.min_delay, self.s.max_delay)
        print(f"  ⏱  waiting {wait // 60}m{wait % 60:02d}s before next email...")
        end = time.time() + wait
        while time.time() < end:
            time.sleep(min(30, max(0, end - time.time())))

    def send_batch(self, limit: int, followups_only: bool = False) -> None:
        if self.live and getattr(self.s, "skip_weekends", True) and date.today().weekday() >= 5:
            print(f"[i] Weekend ({date.today():%A}) — sending paused. No emails sent today.")
            return
        queue = [("followup", k) for k in self.due_followups()]
        if not followups_only:
            queue += [("initial", k) for k, r in self.store.tools.items() if r["status"] == st.READY]
        queue = queue[:limit]
        if not queue:
            print("[i] Nothing to send. Run `discover` first, or no follow-ups are due yet.")
            return
        print(f"[*] {'LIVE' if self.live else 'DRY-RUN'} · {len(queue)} email(s) queued · "
              f"sent today {self.store.sent_today()}/{self.s.daily_limit}")
        sent_any = False
        for i, (kind, key) in enumerate(queue):
            if self.live and not self._can_send():
                print(f"[i] Daily limit {self.s.daily_limit} reached — stopping. Resume tomorrow.")
                break
            if self.live and sent_any:
                self._pause()
            ok = self.send_followup(key) if kind == "followup" else self.send_initial(key)
            sent_any = sent_any or ok
        if self.live and sent_any:
            self.sync_crm()

    def send_test(self, to: str, only: str = "") -> None:
        key = only or next(iter(self.store.tools))
        rec = self.store.tools[key]
        subject, body = initial_email(tool_from_record(rec), self.s, rec.get("video_url", ""))
        msg = build_message(self.s, to, "[TEST] " + subject, body)
        self.mailer.send(msg)
        print(f"[✓] Test email for '{rec['tool_name']}' sent to {to} (not logged as outreach).")

    # ── continuous mode ──────────────────────────────────────────────────────
    def run_forever(self) -> None:
        monitor = InboxMonitor(self.s, self.store, self.mailer, self.notify)
        last_sync = last_poll = 0.0
        next_send_at = 0.0
        print(f"[*] Continuous mode ({'LIVE' if self.live else 'DRY-RUN'}). Ctrl+C to stop.")
        while True:
            now = time.time()
            if now - last_sync > 24 * 3600:
                self.sync()
                last_sync = now
            if now - last_poll > self.s.imap_poll_minutes * 60:
                try:
                    stats = monitor.run_once()
                    if stats["checked"]:
                        print(f"  📥 inbox: {stats}")
                except Exception as exc:
                    print(f"  (inbox check failed: {exc})")
                last_poll = now
            if now >= next_send_at and self._can_send():
                due = self.due_followups()
                ready = [k for k, r in self.store.tools.items() if r["status"] == st.READY]
                if not due and not ready:
                    pending = [k for k, r in self.store.tools.items() if r["status"] == st.PENDING]
                    if pending:
                        self.discover(limit=1, only=pending[0])
                        continue
                sent = False
                if due:
                    sent = self.send_followup(due[0])
                elif ready:
                    sent = self.send_initial(ready[0])
                if sent:
                    next_send_at = time.time() + random.randint(self.s.min_delay, self.s.max_delay)
                elif not self.live:
                    print("[i] Dry-run continuous mode only previews one cycle. Use --live to send.")
                    return
            time.sleep(20)

    # ── status / check ───────────────────────────────────────────────────────
    def status(self) -> None:
        c = Counter(r["status"] for r in self.store.tools.values())
        print(f"Tools tracked: {len(self.store.tools)} · sent today: {self.store.sent_today()}/{self.s.daily_limit}")
        for s_, label in st.STATUS_LABEL.items():
            if c.get(s_):
                print(f"  {label:<26} {c[s_]}")
        print(f"  Suppressed addresses       {len(self.store.data['suppression'])}")
        print(f"  Follow-ups due now         {len(self.due_followups())}")
        hot = [r for r in self.store.tools.values() if r["status"] == st.HOT_LEAD]
        for r in hot:
            print(f"  🔥 {r['tool_name']}: {r.get('last_note', '')}")

    def sync_crm(self) -> None:
        print("[*] Syncing live outreach state to Google Sheets...")
        tab_name = self.sheet.sync_crm_tab(self.store.tools)
        print(f"[✓] Tracking CRM updated: Tab '{tab_name}' ({len(self.store.tools)} tools)")
        # Also mirror per-tool outreach status into the 'Present Data in Website' sheet
        try:
            status_tab = self.sheet.sync_outreach_status_tab(self.store.tools)
            print(f"[✓] 'Present Data in Website' updated: Tab '{status_tab}' ({len(self.store.tools)} tools)")
        except Exception as exc:
            print(f"[!] Outreach Status tab sync warning: {exc}")


def check(s: Settings) -> None:
    ok = True

    def line(good: bool, msg: str) -> None:
        nonlocal ok
        ok = ok and good
        print(f"  {'✅' if good else '❌'} {msg}")

    print("[*] Pre-flight checks")
    m = Mailer(s)
    try:
        m.verify_login()
        line(True, f"SMTP login {s.smtp_host}:{s.smtp_port} as {s.sender_email}")
    except Exception as exc:
        line(False, f"SMTP login failed: {exc}")
    try:
        conn = m.imap()
        sent, drafts = Mailer.special_folder(conn, "sent"), Mailer.special_folder(conn, "drafts")
        conn.logout()
        line(True, f"IMAP login {s.imap_host}:{s.imap_port} · Sent='{sent}' Drafts='{drafts}'")
    except Exception as exc:
        line(False, f"IMAP login failed: {exc}")
    try:
        n = len(Sheet(s).read_tools())
        line(n > 0, f"Google Sheet readable · {n} tools in '{s.sheet_tab}'")
    except Exception as exc:
        line(False, f"Google Sheet: {exc}")
    try:
        import dns.resolver
        domain = s.sender_email.split("@", 1)[1]
        txt = " ".join(r.to_text() for r in dns.resolver.resolve(domain, "TXT"))
        line("v=spf1" in txt, "SPF record present" if "v=spf1" in txt else "SPF record missing")
        try:
            dns.resolver.resolve(f"default._domainkey.{domain}", "TXT")
            line(True, "DKIM (selector 'default') present")
        except Exception:
            print("  ⚠️  DKIM record not found for selector 'default' — enable DKIM in Namecheap Private Email "
                  "for best inbox placement")
        try:
            dmarc = " ".join(r.to_text() for r in dns.resolver.resolve(f"_dmarc.{domain}", "TXT"))
            line(True, f"DMARC present ({dmarc.strip(chr(34))[:40]}...)")
        except Exception:
            print("  ⚠️  No DMARC record")
    except Exception as exc:
        print(f"  ⚠️  DNS check skipped: {exc}")
    try:
        socket.create_connection(("gmail-smtp-in.l.google.com", 25), timeout=6).close()
        print("  ✅ Outbound port 25 open — SMTP mailbox probes available")
    except OSError:
        print("  ⚠️  Outbound port 25 blocked — contact checks fall back to MX-only "
              "(role guesses need ALLOW_UNVERIFIED_FALLBACK=true)")
    print(f"  {'✅' if GA4_PROOF_PATH.exists() else '⚠️ '} GA4 proof image "
          f"{'found' if GA4_PROOF_PATH.exists() else 'missing'}: {GA4_PROOF_PATH}")
    print("\n[✓] Ready." if ok else "\n[!] Fix the ❌ items above before sending.")


def main() -> None:
    p = argparse.ArgumentParser(description="ToolverAI sponsorship outreach")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check")
    sub.add_parser("sync")
    sub.add_parser("crm")
    sub.add_parser("status")
    sub.add_parser("monitor")
    d = sub.add_parser("discover")
    d.add_argument("--limit", type=int, default=10)
    d.add_argument("--tool", default="")
    d.add_argument("--retry", action="store_true", help="also retry tools marked needs_review")
    pv = sub.add_parser("preview")
    pv.add_argument("--limit", type=int, default=120)
    pv.add_argument("--tool", default="")
    for name in ("send", "followup"):
        sp = sub.add_parser(name)
        sp.add_argument("--live", action="store_true", help="actually send (default is dry-run)")
        sp.add_argument("--limit", type=int, default=35)
        if name == "send":
            sp.add_argument("--test-to", default="", help="send ONE sample email to this address only")
            sp.add_argument("--tool", default="")
    r = sub.add_parser("run")
    r.add_argument("--live", action="store_true")
    args = p.parse_args()

    s = load_settings()
    if args.cmd == "check":
        return check(s)

    app = App(s, live=getattr(args, "live", False))
    if args.cmd == "sync":
        app.sync()
    elif args.cmd == "crm":
        if not app.store.tools:
            app.sync()
        app.sync_crm()
    elif args.cmd == "status":
        app.status()
    elif args.cmd == "discover":
        if not app.store.tools:
            app.sync()
        app.discover(args.limit, args.tool, args.retry)
    elif args.cmd == "preview":
        if not app.store.tools:
            app.sync()
        app.preview(args.limit, args.tool)
    elif args.cmd == "monitor":
        with st.RunLock():
            stats = InboxMonitor(s, app.store, app.mailer, app.notify).run_once()
            print(f"[✓] Inbox pass: {stats}")
    elif args.cmd in ("send", "followup"):
        if not app.store.tools:
            app.sync()
        if getattr(args, "test_to", ""):
            return app.send_test(args.test_to, args.tool)
        with st.RunLock():
            app.send_batch(args.limit, followups_only=args.cmd == "followup")
    elif args.cmd == "run":
        with st.RunLock():
            app.run_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[i] Stopped.")
        sys.exit(0)
