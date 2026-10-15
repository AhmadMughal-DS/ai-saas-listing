"""SMTP sending + IMAP mailbox helpers (Sent copy, Drafts)."""
from __future__ import annotations

import imaplib
import mimetypes
import re
import smtplib
import ssl
import time
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from pathlib import Path

from config import Settings


def build_message(s: Settings, to: str, subject: str, body: str, *, in_reply_to: str = "",
                  references: list[str] | None = None, attachment: Path | None = None) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((s.sender_name, s.sender_email))
    msg["To"] = to
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=s.sender_email.split("@", 1)[1])
    msg["Reply-To"] = s.sender_email
    msg["List-Unsubscribe"] = f"<mailto:{s.sender_email}?subject=unsubscribe>"
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = " ".join(references or [in_reply_to])
    msg.set_content(body)
    if attachment and attachment.exists():
        ctype, _ = mimetypes.guess_type(attachment.name)
        maintype, subtype = (ctype or "application/octet-stream").split("/", 1)
        msg.add_attachment(attachment.read_bytes(), maintype=maintype, subtype=subtype, filename=attachment.name)
    return msg


class Mailer:
    def __init__(self, s: Settings):
        if not s.app_password:
            raise SystemExit("[!] SENDER_APP_PASSWORD missing in sponsorship-outreach/.env")
        self.s = s
        self.ctx = ssl.create_default_context()

    # ── SMTP ─────────────────────────────────────────────────────────────────
    def verify_login(self) -> None:
        with self._smtp() as smtp:
            smtp.noop()

    def _smtp(self) -> smtplib.SMTP:
        if self.s.smtp_port == 465:
            smtp = smtplib.SMTP_SSL(self.s.smtp_host, 465, context=self.ctx, timeout=30)
        else:
            smtp = smtplib.SMTP(self.s.smtp_host, self.s.smtp_port, timeout=30)
            smtp.starttls(context=self.ctx)
        smtp.login(self.s.sender_email, self.s.app_password)
        return smtp

    def send(self, msg: EmailMessage) -> None:
        with self._smtp() as smtp:
            refused = smtp.send_message(msg)
            if refused:
                raise smtplib.SMTPRecipientsRefused(refused)
        # Keep a copy in the mailbox Sent folder so the thread is visible in webmail
        try:
            self.append(msg, "sent")
        except Exception as exc:
            print(f"      (could not save copy to Sent folder: {exc})")

    # ── IMAP ─────────────────────────────────────────────────────────────────
    def imap(self) -> imaplib.IMAP4_SSL:
        conn = imaplib.IMAP4_SSL(self.s.imap_host, self.s.imap_port, ssl_context=self.ctx)
        conn.login(self.s.sender_email, self.s.app_password)
        return conn

    @staticmethod
    def special_folder(conn: imaplib.IMAP4_SSL, kind: str) -> str:
        """Find the Sent/Drafts folder via SPECIAL-USE flags, falling back to common names."""
        flag = {"sent": r"\Sent", "drafts": r"\Drafts"}[kind]
        names = {"sent": ["Sent", "INBOX.Sent", "Sent Items", "Sent Messages"],
                 "drafts": ["Drafts", "INBOX.Drafts", "Draft"]}[kind]
        typ, data = conn.list()
        folders = []
        for raw in data or []:
            line = raw.decode(errors="ignore") if isinstance(raw, bytes) else str(raw)
            m = re.match(r'\((?P<flags>[^)]*)\)\s+"(?P<delim>[^"]*)"\s+(?P<name>.+)$', line)
            if not m:
                continue
            name = m.group("name").strip().strip('"')
            folders.append(name)
            if flag.lower() in m.group("flags").lower():
                return name
        for n in names:
            if n in folders:
                return n
        return names[0]

    def append(self, msg: EmailMessage, kind: str) -> None:
        conn = self.imap()
        try:
            folder = self.special_folder(conn, kind)
            flags = r"(\Seen)" if kind == "sent" else r"(\Draft \Seen)"
            mailbox = f'"{folder}"' if " " in folder else folder
            conn.append(mailbox, flags, imaplib.Time2Internaldate(time.time()), msg.as_bytes())
        finally:
            try:
                conn.logout()
            except Exception:
                pass
