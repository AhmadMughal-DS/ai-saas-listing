"""Google Sheet integration — reads tool rows and writes status into the Notes column.

Columns are resolved by header text (not fixed letters) so re-ordering the sheet
does not break the pipeline.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse

import gspread
from google.oauth2.service_account import Credentials

from config import Settings

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

HEADERS = {
    "name": "Tool Name",
    "category": "Category",
    "traffic": "Monthly Traffic",
    "website": "Official Website",
    "live_page": "ToolverAI Live Page",
    "deal": "Exclusive Deal / Promo Code",
    "features": "Key Features",
    "caption": "📝 Social Post & Video Caption",   # prefix match
    "video_url": "Published Video URL",
    "notes": "Notes",
}


@dataclass
class ToolRow:
    row_number: int  # 1-based sheet row
    name: str
    category: str
    traffic: str
    website: str
    live_page: str
    deal: str
    features: list[str]
    caption: str
    video_url: str
    notes: str

    @property
    def key(self) -> str:
        path = urlparse(self.live_page).path.rstrip("/")
        slug = path.rsplit("/", 1)[-1] if path else ""
        return slug or re.sub(r"[^a-z0-9]+", "-", self.name.lower()).strip("-")

    @property
    def domain(self) -> str:
        return registrable_host(self.website)

    @property
    def problem(self) -> str:
        return _caption_section(self.caption, "The Problem")

    @property
    def solution(self) -> str:
        return _caption_section(self.caption, "The Solution")


def registrable_host(url: str) -> str:
    if not url:
        return ""
    if "://" not in url:
        url = "https://" + url
    host = (urlparse(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


# Emoji / pictographic symbol ranges (re has no \p{Emoji}); covers 🔥✨💼🚀📌🏷️🔗🎥 etc.
_EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF\U00002B00-\U00002BFF"
    "\U00002190-\U000021FF️‍]+"
)


def strip_markdown(text: str) -> str:
    """Remove markdown emphasis (**bold**, *italic*, _underscore_, `code`) and any emojis
    that leak in from sheet captions, so cold emails stay clean, professional plain text."""
    if not text:
        return ""
    text = re.sub(r"\*{1,3}(.+?)\*{1,3}", r"\1", text)      # **bold** / *italic*
    text = re.sub(r"`([^`]+)`", r"\1", text)                 # `code`
    text = re.sub(r"(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])", r"\1", text)  # _underscore_
    text = text.replace("*", "").replace("`", "")            # strip any stray markers
    text = _EMOJI_RE.sub("", text)                           # strip emojis / pictographs
    return re.sub(r"\s+", " ", text).strip()


def _caption_section(caption: str, label: str) -> str:
    if not caption:
        return ""
    m = re.search(rf"{label}\s*[:：]\s*(.+?)(?:\n\s*\n|\n\s*[^\w\s]{{1,3}}\s*\w[^\n]*:|\Z)", caption, re.S | re.I)
    return strip_markdown(re.sub(r"\s+", " ", m.group(1)).strip()) if m else ""


def first_sentence(text: str, max_len: int = 220) -> str:
    """Short, clean preview — first sentence, hard-capped."""
    if not text:
        return ""
    m = re.match(r"(.+?[.!?])(\s|$)", text)
    s = m.group(1) if m else text
    if len(s) > max_len:
        s = s[: max_len - 1].rsplit(" ", 1)[0] + "…"
    return s


class Sheet:
    def __init__(self, settings: Settings):
        self.settings = settings
        creds = Credentials.from_service_account_file(settings.service_account_file, scopes=SCOPES)
        self.gc = gspread.authorize(creds)
        self.ss_source = self.gc.open_by_key(settings.spreadsheet_id)
        self.ws = self.ss_source.worksheet(settings.sheet_tab)
        self._cols: dict[str, int] = {}

        # Dedicated Hunting & Outreach Tracking Google Sheet
        track_id = getattr(settings, "hunting_log_spreadsheet_id", None) or settings.spreadsheet_id
        try:
            self.ss_tracking = self.gc.open_by_key(track_id)
        except Exception as exc:
            print(f"      (tracking sheet notice: {exc})")
            self.ss_tracking = self.ss_source

    def _resolve_columns(self, header_row: list[str]) -> None:
        for field, title in HEADERS.items():
            for idx, h in enumerate(header_row):
                if h.strip() == title or h.strip().startswith(title):
                    self._cols[field] = idx
                    break
        missing = [HEADERS[f] for f in ("name", "website", "live_page") if f not in self._cols]
        if missing:
            raise RuntimeError(f"Sheet is missing required columns: {missing}")

    def read_tools(self) -> list[ToolRow]:
        values = self.ws.get_all_values()
        if not values:
            return []
        self._resolve_columns(values[0])

        def cell(row: list[str], field: str) -> str:
            i = self._cols.get(field)
            return row[i].strip() if i is not None and i < len(row) else ""

        tools: list[ToolRow] = []
        for n, row in enumerate(values[1:], start=2):
            name = cell(row, "name")
            if not name:
                continue
            tools.append(ToolRow(
                row_number=n, name=name, category=cell(row, "category"), traffic=cell(row, "traffic"),
                website=cell(row, "website"), live_page=cell(row, "live_page"), deal=cell(row, "deal"),
                features=[f.strip() for f in cell(row, "features").split("|") if f.strip()],
                caption=cell(row, "caption"), video_url=cell(row, "video_url"), notes=cell(row, "notes"),
            ))
        return tools

    def write_note(self, row_number: int, text: str) -> None:
        if "notes" not in self._cols:
            self._resolve_columns(self.ws.row_values(1))
        col = self._cols["notes"] + 1
        self.ws.update_cell(row_number, col, text)

    def sync_crm_tab(self, store_tools: dict) -> str:
        """Create or update Tab 1: '🎯 Live Outreach CRM (120 Tools)' in the tracking sheet."""
        tab_name = "🎯 Live Outreach CRM (120 Tools)"
        try:
            ws_crm = self.ss_tracking.worksheet(tab_name)
        except gspread.WorksheetNotFound:
            ws_crm = self.ss_tracking.add_worksheet(title=tab_name, rows=len(store_tools) + 20, cols=15)

        headers = [
            "📍 Queue Check & Resume Marker",
            "Tool Name",
            "Category",
            "Monthly Traffic",
            "Official Website",
            "Target Contact Email",
            "Email Source",
            "Confidence",
            "Outreach Status",
            "Email #1 Sent At",
            "Email #1 Subject",
            "Follow-up Sent At",
            "ToolverAI Live Page",
            "Problem & Solution Hook",
            "Live Notes / Reply Snippet"
        ]

        from store import STATUS_LABEL
        rows = [headers]

        # Find the very first tool ready to be sent next (Resume point)
        first_ready_key = None
        for k, r in store_tools.items():
            if r.get("status") == "ready":
                first_ready_key = k
                break

        for key, rec in store_tools.items():
            c = rec.get("contact") or {}
            status_raw = rec.get("status", "pending")
            status_text = STATUS_LABEL.get(status_raw, status_raw)

            msgs = rec.get("messages", [])
            initial_msg = next((m for m in msgs if m.get("type") == "initial"), None)
            followup_msg = next((m for m in msgs if m.get("type") == "followup"), None)

            initial_sent_at = initial_msg.get("sent_at", "")[:19] if initial_msg else ""
            initial_subject = initial_msg.get("subject", "") if initial_msg else ""
            followup_sent_at = followup_msg.get("sent_at", "")[:19] if followup_msg else ""

            # Calculate clear visual marker for where outreach stands and where it resumes
            if status_raw in ("sent", "followed_up"):
                marker = "✅ COMPLETED (Email Sent)"
            elif key == first_ready_key:
                marker = "👉 RESUME HERE (Next In Line)"
            elif status_raw == "ready":
                marker = "⏳ Queued (Ready to Send)"
            elif status_raw == "skipped":
                marker = "⏭️ SKIPPED (Excluded Domain)"
            elif status_raw == "needs_review":
                marker = "🔍 Skipped (No Verified Email)"
            elif status_raw == "hot_lead":
                marker = "🔥 HOT LEAD (Replied!)"
            elif status_raw == "bounced":
                marker = "❌ Skipped (Bounced)"
            elif status_raw == "opted_out":
                marker = "🚫 Skipped (Opted Out)"
            else:
                marker = "⏳ Pending Contact Search"

            hook = ""
            caption = rec.get("caption", "")
            if caption:
                p = first_sentence(_caption_section(caption, "The Problem"), 120)
                s = first_sentence(_caption_section(caption, "The Solution"), 120)
                if p and s:
                    hook = f"Problem: {p} | Solution: {s}"

            rows.append([
                marker,
                rec.get("tool_name", key),
                rec.get("category", ""),
                rec.get("traffic", ""),
                rec.get("website", ""),
                c.get("email", ""),
                c.get("source", ""),
                c.get("confidence", "").capitalize(),
                status_text,
                initial_sent_at,
                initial_subject,
                followup_sent_at,
                rec.get("live_page", ""),
                hook,
                rec.get("sheet_note", rec.get("last_note", ""))
            ])

        ws_crm.clear()
        ws_crm.append_rows(rows, value_input_option='USER_ENTERED')

        # Format header & column layout
        try:
            ws_crm.format('A1:O1', {
                'backgroundColor': {'red': 0.05, 'green': 0.11, 'blue': 0.24},  # Deep Midnight Blue
                'textFormat': {'bold': True, 'foregroundColor': {'red': 1.0, 'green': 1.0, 'blue': 1.0}, 'fontSize': 10},
                'horizontalAlignment': 'CENTER',
                'verticalAlignment': 'MIDDLE',
            })
            ws_crm.freeze(rows=1, cols=2)
            ws_crm.format(f'A2:A{len(rows)}', {'textFormat': {'bold': True}, 'horizontalAlignment': 'CENTER', 'verticalAlignment': 'MIDDLE'})
            ws_crm.format(f'N2:O{len(rows)}', {'wrapStrategy': 'WRAP', 'verticalAlignment': 'TOP', 'textFormat': {'fontSize': 9}})
            ws_crm.format(f'F2:L{len(rows)}', {'verticalAlignment': 'MIDDLE'})
        except Exception:
            pass

        # Also initialize Tab 2: Activity History if missing
        self._ensure_activity_tab()

        return tab_name

    def _ensure_activity_tab(self) -> None:
        """Ensure Tab 2: '📜 Live Activity & Send History' exists with formatting."""
        tab_history = "📜 Live Activity & Send History"
        try:
            self.ss_tracking.worksheet(tab_history)
        except gspread.WorksheetNotFound:
            ws_hist = self.ss_tracking.add_worksheet(title=tab_history, rows=1000, cols=7)
            ws_hist.append_row(["Timestamp (UTC)", "Tool Name", "Action / Event", "Recipient Email", "Subject Line", "Details / Snippet"])
            try:
                ws_hist.format('A1:F1', {
                    'backgroundColor': {'red': 0.05, 'green': 0.11, 'blue': 0.24},
                    'textFormat': {'bold': True, 'foregroundColor': {'red': 1.0, 'green': 1.0, 'blue': 1.0}, 'fontSize': 10},
                    'horizontalAlignment': 'CENTER',
                })
                ws_hist.freeze(rows=1)
            except Exception:
                pass

    def record_activity(self, tool_name: str, event: str, email: str, subject: str, detail: str) -> None:
        """Log an event directly into Tab 2: '📜 Live Activity & Send History'."""
        if not self.ss_tracking:
            return
        try:
            self._ensure_activity_tab()
            ws_hist = self.ss_tracking.worksheet("📜 Live Activity & Send History")
            from datetime import datetime, timezone
            ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            ws_hist.append_row([ts, tool_name, event, email, subject, detail], value_input_option='USER_ENTERED')
        except Exception as exc:
            print(f"      (record_activity error: {exc})")

    # ── Outreach status inside the "Present Data in Website" spreadsheet ──────
    def sync_outreach_status_tab(self, store_tools: dict) -> str:
        """Write per-tool outreach status into a dedicated tab of the main
        'Present Data in Website' spreadsheet (the live website-data tab is never
        touched). Answers, per tool: was an email found, which address, is it
        confirmed/verified, which address we emailed and when, and whether it
        bounced (address not found). Auto-refreshed on every daily run."""
        tab_name = "Outreach Status"
        try:
            ws = self.ss_source.worksheet(tab_name)
        except gspread.WorksheetNotFound:
            ws = self.ss_source.add_worksheet(title=tab_name, rows=len(store_tools) + 20, cols=16)

        status_text = {
            "pending": "Pending (no contact yet)",
            "ready": "Email found — ready to send",
            "needs_review": "No email found — needs review",
            "skipped": "Skipped (excluded / no website)",
            "sent": "Email #1 sent",
            "followed_up": "Follow-up sent",
            "replied": "Replied (manual review)",
            "hot_lead": "Hot lead — replied",
            "opted_out": "Opted out",
            "bounced": "Bounced — address not found",
        }
        found_states = {"ready", "sent", "followed_up", "replied", "hot_lead", "opted_out"}

        headers = [
            "Tool Name", "Category", "Official Website",
            "Email Found?", "Contact Email", "Contact Person", "Title (Role)", "Email Source",
            "Confidence %", "Email Confirmed?",
            "Outreach Status", "Emailed Address", "Email #1 Sent At", "Follow-up Sent At",
            "Bounced / Address Not Found", "Last Update / Note",
        ]
        rows = [headers]

        for key, rec in store_tools.items():
            c = rec.get("contact") or {}
            status_raw = rec.get("status", "pending")
            email = c.get("email", "")
            confidence = (c.get("confidence") or "").lower()

            email_found = "Yes" if (email or status_raw in found_states) else "No"
            if email and confidence in ("verified", "high", "confirmed"):
                confirmed = "Yes (verified)"
            elif email:
                confirmed = "Unverified guess"
            else:
                confirmed = "—"

            msgs = rec.get("messages", [])
            initial_msg = next((m for m in msgs if m.get("type") == "initial"), None)
            followup_msg = next((m for m in msgs if m.get("type") == "followup"), None)
            emailed_to = (initial_msg or {}).get("to", "")
            initial_at = (initial_msg or {}).get("sent_at", "")[:19]
            followup_at = (followup_msg or {}).get("sent_at", "")[:19]

            if status_raw == "bounced":
                note = rec.get("last_note", "") or ""
                bounced = emailed_to or (note.split("bounce:")[-1].strip() if "bounce:" in note else "Yes")
            else:
                bounced = ""

            rows.append([
                rec.get("tool_name", key),
                rec.get("category", ""),
                rec.get("website", ""),
                email_found,
                email,
                c.get("person", ""),
                c.get("title", ""),
                c.get("source", ""),
                c.get("confidence_score", ""),
                confirmed,
                status_text.get(status_raw, status_raw),
                emailed_to,
                initial_at,
                followup_at,
                bounced,
                rec.get("last_note", ""),
            ])

        ws.clear()
        ws.append_rows(rows, value_input_option="USER_ENTERED")
        try:
            ws.format("A1:P1", {
                "backgroundColor": {"red": 0.05, "green": 0.11, "blue": 0.24},
                "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10},
                "horizontalAlignment": "CENTER",
                "verticalAlignment": "MIDDLE",
            })
            ws.freeze(rows=1, cols=1)
            ws.format(f"D2:D{len(rows)}", {"horizontalAlignment": "CENTER"})
            ws.format(f"P2:P{len(rows)}", {"wrapStrategy": "WRAP", "textFormat": {"fontSize": 9}})
        except Exception:
            pass
        return tab_name
