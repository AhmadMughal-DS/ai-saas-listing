"""Persistent JSON state: per-tool outreach status, suppression list, IMAP cursor.

Writes are atomic (temp file + os.replace) so a crash never corrupts the log.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from config import LOCK_PATH, LOG_PATH

# Status lifecycle
PENDING = "pending"            # loaded from sheet, no contact yet
READY = "ready"                # contact verified, initial email not sent
NEEDS_REVIEW = "needs_review"  # no safe contact found — manual action needed
SKIPPED = "skipped"            # excluded domain / missing website
SENT = "sent"                  # initial email delivered to SMTP
FOLLOWED_UP = "followed_up"    # day-3 follow-up sent
REPLIED = "replied"            # human reply, neutral — review manually
HOT_LEAD = "hot_lead"          # positive reply — pricing draft prepared
OPTED_OUT = "opted_out"        # asked not to be contacted
BOUNCED = "bounced"            # hard bounce

TERMINAL = {REPLIED, HOT_LEAD, OPTED_OUT, BOUNCED, SKIPPED}

STATUS_LABEL = {
    PENDING: "⏳ Pending", READY: "✅ Ready", NEEDS_REVIEW: "🔍 Needs contact review",
    SKIPPED: "⏭️ Skipped", SENT: "📤 Email #1 sent", FOLLOWED_UP: "📨 Follow-up sent",
    REPLIED: "💬 Replied", HOT_LEAD: "🔥 Hot Lead", OPTED_OUT: "🚫 Opted out", BOUNCED: "❌ Bounced",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def today_key() -> str:
    return datetime.now().strftime("%Y-%m-%d")


class Store:
    def __init__(self, path: Path = LOG_PATH):
        self.path = path
        self.data = {"version": 1, "tools": {}, "suppression": {}, "imap": {}, "daily": {}, "events": []}
        if path.exists():
            with path.open("r", encoding="utf-8") as fh:
                self.data.update(json.load(fh))

    # ── persistence ──────────────────────────────────────────────────────────
    def save(self) -> None:
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8") as fh:
            json.dump(self.data, fh, indent=2, ensure_ascii=False)
        os.replace(tmp, self.path)

    # ── tools ────────────────────────────────────────────────────────────────
    @property
    def tools(self) -> dict:
        return self.data["tools"]

    def upsert_tool(self, key: str, sheet_fields: dict) -> dict:
        rec = self.tools.get(key)
        if rec is None:
            rec = {"status": PENDING, "contact": None, "messages": [], "replies": [], "created_at": now_iso()}
            self.tools[key] = rec
        rec.update(sheet_fields)  # always refresh sheet-driven fields
        return rec

    def set_status(self, key: str, status: str, note: str = "") -> None:
        rec = self.tools[key]
        rec["status"] = status
        rec["status_at"] = now_iso()
        if note:
            rec["last_note"] = note
        self.log_event(key, status, note)

    def log_event(self, key: str, kind: str, detail: str = "") -> None:
        self.data["events"].append({"at": now_iso(), "tool": key, "event": kind, "detail": detail})
        self.data["events"] = self.data["events"][-2000:]

    def find_by_message_id(self, msg_ids: list[str]) -> str | None:
        wanted = {m.strip("<> ").lower() for m in msg_ids if m}
        for key, rec in self.tools.items():
            for m in rec.get("messages", []):
                if m.get("message_id", "").strip("<> ").lower() in wanted:
                    return key
        return None

    def find_by_email(self, email: str) -> str | None:
        email = email.lower()
        for key, rec in self.tools.items():
            c = rec.get("contact") or {}
            if c.get("email", "").lower() == email:
                return key
        return None

    def find_by_domain(self, domain: str) -> str | None:
        domain = domain.lower()
        for key, rec in self.tools.items():
            d = (rec.get("domain") or "").lower()
            if d and (domain == d or domain.endswith("." + d)) and rec.get("messages"):
                return key
        return None

    # ── suppression ──────────────────────────────────────────────────────────
    def suppress(self, email: str, reason: str) -> None:
        self.data["suppression"][email.lower()] = {"reason": reason, "at": now_iso()}

    def is_suppressed(self, email: str) -> bool:
        return email.lower() in self.data["suppression"]

    # ── daily quota ──────────────────────────────────────────────────────────
    def sent_today(self) -> int:
        return int(self.data["daily"].get(today_key(), 0))

    def count_send(self) -> None:
        k = today_key()
        self.data["daily"][k] = int(self.data["daily"].get(k, 0)) + 1


class RunLock:
    """Prevents two senders running at once (double emails)."""

    def __enter__(self):
        if LOCK_PATH.exists():
            try:
                pid = int(LOCK_PATH.read_text().strip() or 0)
            except ValueError:
                pid = 0
            if pid and _pid_alive(pid):
                raise SystemExit(f"[!] Another outreach process (PID {pid}) is running. "
                                 f"Delete {LOCK_PATH.name} if this is wrong.")
        LOCK_PATH.write_text(str(os.getpid()))
        return self

    def __exit__(self, *exc):
        try:
            LOCK_PATH.unlink()
        except FileNotFoundError:
            pass


def _pid_alive(pid: int) -> bool:
    if os.name == "nt":
        import ctypes
        handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if handle:
            ctypes.windll.kernel32.CloseHandle(handle)
            return True
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False
