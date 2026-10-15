"""Central configuration for the ToolverAI sponsorship outreach system.

All secrets are read from ``sponsorship-outreach/.env`` (gitignored). Nothing
sensitive is hard-coded here.
"""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
ENV_PATH = BASE_DIR / ".env"
ROOT_ENV_PATH = PROJECT_ROOT / ".env"

LOG_PATH = BASE_DIR / "outreach-log.json"
LOCK_PATH = BASE_DIR / "outreach.lock"
ASSETS_DIR = BASE_DIR / "assets"
GA4_PROOF_PATH = ASSETS_DIR / "ga4-traffic-proof.png"
PREVIEW_DIR = BASE_DIR / "previews"
DRAFTS_DIR = BASE_DIR / "drafts"

# Ensure UTF-8 console output on Windows (emoji in tab names / captions)
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:  # pragma: no cover
    pass


def _env() -> dict:
    values: dict = {}
    if ROOT_ENV_PATH.exists():
        root = dotenv_values(ROOT_ENV_PATH)
        # Only borrow MongoDB settings from the project root .env
        for k in ("MONGODB_URI", "MONGODB_DB_NAME"):
            if root.get(k):
                values[k] = root[k]
    if ENV_PATH.exists():
        values.update({k: v for k, v in dotenv_values(ENV_PATH).items() if v not in (None, "")})
    # Real environment variables win (useful for servers / CI)
    for k, v in os.environ.items():
        if k.startswith(("SENDER_", "SMTP_", "IMAP_", "SOCIAL_", "MONGODB_", "GOOGLE_")) or k in (
            "SPREADSHEET_ID", "SHEET_TAB", "WEBSITE_URL", "DAILY_SEND_LIMIT", "MIN_DELAY_SECONDS",
            "MAX_DELAY_SECONDS", "FOLLOWUP_AFTER_BUSINESS_DAYS", "SMTP_PROBE",
            "ALLOW_UNVERIFIED_FALLBACK", "EXCLUDE_DOMAINS", "YOUTUBE_CHANNEL_ID", "IMAP_POLL_MINUTES",
            "HUNTING_SPREADSHEET_ID", "EXCEL_LEADS_PATH", "HUNTING_LOG_SPREADSHEET_ID",
        ):
            values[k] = v
    return values


def _bool(v: str | None, default: bool) -> bool:
    if v is None or v == "":
        return default
    return str(v).strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class SponsorTier:
    name: str
    price: str
    includes: str


SPONSOR_TIERS: list[SponsorTier] = [
    SponsorTier("Featured Category Pin", "$49 / month",
                "Your tool pinned to the top of its category page with a 'Featured' badge."),
    SponsorTier("Homepage Spotlight + Video Asset Rights", "$99 / month",
                "Homepage featured spot, plus full ad-usage rights to your 30-second Problem→Solution video."),
    SponsorTier("Full Monthly Partner Pack", "$199 / month",
                "Homepage + category pin, video rights, a dedicated post across all ToolverAI social channels, "
                "and inclusion in our comparison/alternatives pages where relevant."),
]


@dataclass
class Settings:
    sender_email: str
    sender_name: str
    app_password: str
    smtp_host: str
    smtp_port: int
    imap_host: str
    imap_port: int
    postal_address: str
    website_url: str
    socials: dict
    youtube_channel_id: str
    service_account_file: str
    spreadsheet_id: str
    sheet_tab: str
    mongodb_uri: str
    mongodb_db: str
    daily_limit: int
    min_delay: int
    max_delay: int
    followup_business_days: int
    smtp_probe: bool
    allow_unverified_fallback: bool
    exclude_domains: set = field(default_factory=set)
    imap_poll_minutes: int = 5
    hunting_spreadsheet_id: str = "1hk3SXmXnvtD4ZJlux9a36NuaMaeo_5rA4KTx0R5Qlac"
    excel_leads_path: str = "D:/company page/client data/all_ai_tools_leads_combined.xlsx"
    hunting_log_spreadsheet_id: str = "1PJST6oHU0x2qhUsdQp2dCSHb7DkUH2GdFZtwMKc5XDc"

    @property
    def youtube_url(self) -> str:
        return self.socials.get("YouTube", "https://www.youtube.com/@toolverai")


def load_settings() -> Settings:
    e = _env()
    return Settings(
        sender_email=e.get("SENDER_EMAIL", "partnership@toolverai.com"),
        sender_name=e.get("SENDER_NAME", "ToolverAI Partnerships"),
        app_password=e.get("SENDER_APP_PASSWORD", ""),
        smtp_host=e.get("SMTP_HOST", "mail.privateemail.com"),
        smtp_port=int(e.get("SMTP_PORT", 465)),
        imap_host=e.get("IMAP_HOST", "mail.privateemail.com"),
        imap_port=int(e.get("IMAP_PORT", 993)),
        postal_address=e.get("SENDER_POSTAL_ADDRESS", ""),
        website_url=e.get("WEBSITE_URL", "https://toolverai.com").rstrip("/"),
        socials={
            "LinkedIn": e.get("SOCIAL_LINKEDIN", "https://www.linkedin.com/company/145275481/"),
            "YouTube": e.get("SOCIAL_YOUTUBE", "https://www.youtube.com/@toolverai"),
            "TikTok": e.get("SOCIAL_TIKTOK", "https://www.tiktok.com/@toolverai"),
            "Instagram": e.get("SOCIAL_INSTAGRAM", "https://www.instagram.com/toolverai/"),
            "Facebook": e.get("SOCIAL_FACEBOOK", "https://www.facebook.com/profile.php?id=61594866789975"),
        },
        youtube_channel_id=e.get("YOUTUBE_CHANNEL_ID", ""),
        service_account_file=e.get(
            "GOOGLE_SERVICE_ACCOUNT_FILE",
            "D:/company page/scrapedatafromtoolify/theta-anchor-454217-k2-95fba9368947.json"),
        spreadsheet_id=e.get("SPREADSHEET_ID", "15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU"),
        sheet_tab=e.get("SHEET_TAB", "🚀 Live Website Tools (120)"),
        mongodb_uri=e.get("MONGODB_URI", ""),
        mongodb_db=e.get("MONGODB_DB_NAME", "toolver_db"),
        daily_limit=int(e.get("DAILY_SEND_LIMIT", 15)),
        min_delay=int(e.get("MIN_DELAY_SECONDS", 300)),
        max_delay=int(e.get("MAX_DELAY_SECONDS", 360)),
        followup_business_days=int(e.get("FOLLOWUP_AFTER_BUSINESS_DAYS", 3)),
        smtp_probe=_bool(e.get("SMTP_PROBE"), True),
        allow_unverified_fallback=_bool(e.get("ALLOW_UNVERIFIED_FALLBACK"), False),
        exclude_domains={d.strip().lower() for d in e.get("EXCLUDE_DOMAINS", "").split(",") if d.strip()},
        imap_poll_minutes=int(e.get("IMAP_POLL_MINUTES", 5)),
        hunting_spreadsheet_id=e.get("HUNTING_SPREADSHEET_ID", "1hk3SXmXnvtD4ZJlux9a36NuaMaeo_5rA4KTx0R5Qlac"),
        excel_leads_path=e.get("EXCEL_LEADS_PATH", "D:/company page/client data/all_ai_tools_leads_combined.xlsx"),
        hunting_log_spreadsheet_id=e.get("HUNTING_LOG_SPREADSHEET_ID", "1PJST6oHU0x2qhUsdQp2dCSHb7DkUH2GdFZtwMKc5XDc"),
    )
