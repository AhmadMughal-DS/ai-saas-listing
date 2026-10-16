"""Contact discovery with bounce protection.

Order (per tool):
  1. Previously verified contact in outreach-log.json
  2. Stored lead emails (MongoDB ``sponsorship_leads.emails``) on the tool's domain
  3. Live scrape of the official website (home, /about, /team, /contact, /press, /privacy…)
  4. Role fallbacks — partnerships@, partner@, bd@, founders@, hello@, marketing@, growth@,
     press@, media@, team@, contact@ (first SMTP/API-verified one wins)

Every candidate must pass syntax + MX checks. Verification is done by a 3rd-party API
(ZeroBounce) when EMAIL_VERIFY_API_KEY is set — this works even when outbound port 25 is
blocked — otherwise by an RCPT-TO SMTP probe (no message is sent). Guessed role addresses
on catch-all domains and unverifiable guesses are rejected unless ALLOW_UNVERIFIED_FALLBACK.
"""
from __future__ import annotations

import random
import re
import smtplib
import socket
import string
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

import dns.exception
import dns.resolver
import requests
from bs4 import BeautifulSoup
from pathlib import Path

from config import Settings

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,24}")
STRICT_RE = re.compile(r"^[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,24}$")
SCRAPE_PATHS = ["", "/contact", "/contact-us", "/about", "/about-us", "/about/team", "/team",
                "/press", "/company", "/partners", "/privacy", "/privacy-policy", "/legal/privacy"]
# Role guesses, best outreach target first. Probed one by one; first verified wins.
FALLBACK_ROLES = ["partnerships", "partner", "bd", "founders", "hello", "hi",
                  "marketing", "growth", "press", "media", "team", "contact"]

# Lower number = better outreach target
LOCAL_PRIORITY = [
    (re.compile(r"^(partner|partnership|partnerships|sponsor|sponsorship|bizdev|bd|business|biz|deals)"), 0),
    (re.compile(r"^(founder|founders|ceo|cofounder|co-founder)"), 1),
    (re.compile(r"^(marketing|growth|brand|pr|press|media|affiliates?)"), 2),
    (re.compile(r"^(hello|hi|hey|contact|team|info|general|inquir|enquir|sales)"), 3),
    (re.compile(r"^(support|help|care|customer)"), 6),
]
BLOCKED_LOCAL = re.compile(
    r"^(no-?reply|do-?not-?reply|mailer|postmaster|abuse|privacy|legal|security|dmca|gdpr|dpo|"
    r"careers?|jobs|hr|recruit|billing|invoice|accounts?|unsubscribe|example|test|user|name|email|your)", re.I)
BLOCKED_DOMAIN = re.compile(
    r"(sentry|wixpress|example\.|domain\.|email\.com$|\.png$|\.jpe?g$|\.gif$|\.svg$|\.webp$|"
    r"github\.com$|gitlab\.com$|twitter\.com$|x\.com$|facebook\.com$|linkedin\.com$|instagram\.com$|"
    r"youtube\.com$|google\.com$|apple\.com$|microsoft\.com$|medium\.com$|discord\.gg$|discord\.com$|"
    r"substack\.com$|t\.me$|telegram\.org$|tiktok\.com$|reddit\.com$|threads\.net$)",
    re.I
)
MULTI_PART_TLDS = {"co.uk", "com.au", "co.in", "co.jp", "com.br", "co.nz", "com.sg", "co.za", "com.mx", "com.tr"}


def base_domain(host: str) -> str:
    host = host.lower().strip(".")
    parts = host.split(".")
    if len(parts) >= 3 and ".".join(parts[-2:]) in MULTI_PART_TLDS:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:]) if len(parts) >= 2 else host


def safe_domain(url_or_host: str) -> str:
    if not url_or_host:
        return ""
    try:
        url_str = str(url_or_host).strip()
        if "://" not in url_str:
            url_str = "https://" + url_str
        host = (urlparse(url_str).hostname or "").lower()
        if host.startswith("www."):
            host = host[4:]
        return base_domain(host) if host else ""
    except Exception:
        m = re.search(r"([a-zA-Z0-9-]+\.[a-zA-Z]{2,})", str(url_or_host))
        return base_domain(m.group(1).lower()) if m else ""


def norm_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


@dataclass
class Contact:
    email: str
    source: str        # log | stored_lead | scraped | role_fallback
    verification: str  # valid | catch_all | unknown | mx_only
    confidence: str    # high | medium | low

    def to_dict(self) -> dict:
        return self.__dict__.copy()


class ContactFinder:
    def __init__(self, settings: Settings, verbose: bool = True):
        self.s = settings
        self.verbose = verbose
        self._mx_cache: dict[str, list[str]] = {}
        self._catch_all: dict[str, str] = {}
        self._port25: bool | None = None
        self._stored: dict[str, list[tuple[str, str]]] | None = None
        self._stored_by_name: dict[str, list[tuple[str, str]]] | None = None

    def log(self, msg: str) -> None:
        if self.verbose:
            print(f"      {msg}")

    # ── stored leads (Multi-sheet: Hunting Sheet, Excel, MongoDB) ─────────────
    def _load_stored(self) -> None:
        if self._stored is not None:
            return
        self._stored = {}
        self._stored_by_name = {}

        # 1. Load from Google Sheet '🎯 Verified Email Leads'
        if getattr(self.s, "hunting_spreadsheet_id", None) and self.s.service_account_file:
            try:
                import gspread
                from google.oauth2.service_account import Credentials
                creds = Credentials.from_service_account_file(
                    self.s.service_account_file,
                    scopes=['https://www.googleapis.com/auth/spreadsheets']
                )
                gc = gspread.authorize(creds)
                ss_hunt = gc.open_by_key(self.s.hunting_spreadsheet_id)
                ws_ver = ss_hunt.worksheet("🎯 Verified Email Leads")
                records = ws_ver.get_all_records()
                for r in records:
                    em = str(r.get("Primary Contact Email") or r.get("Secondary Email") or "").strip()
                    if em and "@" in em:
                        d = safe_domain(r.get("Website"))
                        n = norm_name(r.get("Tool Name"))
                        if d:
                            self._stored.setdefault(d, []).append((em, "Hunting: Verified Leads"))
                        if n:
                            self._stored_by_name.setdefault(n, []).append((em, "Hunting: Verified Leads"))
                self.log(f"Loaded {len(records)} verified leads from Google Hunting Sheet")
            except Exception as exc:
                self.log(f"(hunting sheet leads unavailable: {exc})")

        # 2. Load from Local Excel 'all_ai_tools_leads_combined.xlsx'
        excel_path = Path(getattr(self.s, "excel_leads_path", "D:/company page/client data/all_ai_tools_leads_combined.xlsx"))
        if excel_path.exists():
            try:
                import openpyxl
                wb = openpyxl.load_workbook(str(excel_path), read_only=True)
                for sheet_name in ['Leads With Email', 'All Combined Leads']:
                    if sheet_name in wb.sheetnames:
                        ws_ex = wb[sheet_name]
                        for row in ws_ex.iter_rows(min_row=2, values_only=True):
                            t_name = norm_name(row[0]) if len(row) > 0 and row[0] else ""
                            t_dom = safe_domain(row[3]) if len(row) > 3 and row[3] else ""
                            em = str(row[5] or row[4] or "").strip() if len(row) > 5 else ""
                            if em and "@" in em:
                                if t_dom:
                                    self._stored.setdefault(t_dom, []).append((em, f"Excel: {sheet_name}"))
                                if t_name:
                                    self._stored_by_name.setdefault(t_name, []).append((em, f"Excel: {sheet_name}"))
                self.log("Loaded verified leads from local Excel spreadsheet")
            except Exception as exc:
                self.log(f"(excel leads unavailable: {exc})")

        # 3. Load from MongoDB 'sponsorship_leads'
        if self.s.mongodb_uri:
            try:
                from pymongo import MongoClient
                client = MongoClient(self.s.mongodb_uri, serverSelectionTimeoutMS=8000)
                col = client[self.s.mongodb_db]["sponsorship_leads"]
                for doc in col.find({"emails.0": {"$exists": True}}, {"url": 1, "name": 1, "emails": 1, "_id": 0}):
                    d = safe_domain(doc.get("url"))
                    n = norm_name(doc.get("name"))
                    for em in doc.get("emails", []):
                        if em and "@" in em:
                            if d:
                                self._stored.setdefault(d, []).append((em, "MongoDB: sponsorship_leads"))
                            if n:
                                self._stored_by_name.setdefault(n, []).append((em, "MongoDB: sponsorship_leads"))
                client.close()
                self.log("Loaded leads from MongoDB sponsorship_leads")
            except Exception as exc:
                self.log(f"(mongo leads unavailable: {exc})")

    # ── DNS / SMTP verification ──────────────────────────────────────────────
    def mx_hosts(self, domain: str) -> list[str]:
        if domain in self._mx_cache:
            return self._mx_cache[domain]
        hosts: list[str] = []
        try:
            answers = dns.resolver.resolve(domain, "MX", lifetime=8)
            hosts = [str(r.exchange).rstrip(".") for r in sorted(answers, key=lambda r: r.preference)]
            hosts = [h for h in hosts if h]  # null MX "." → no mail
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.exception.Timeout):
            hosts = []
        self._mx_cache[domain] = hosts
        return hosts

    def _rcpt(self, mx: str, addresses: list[str]) -> list[int | None]:
        codes: list[int | None] = []
        with smtplib.SMTP(mx, 25, timeout=12) as smtp:
            smtp.ehlo("toolverai.com")
            if smtp.has_extn("starttls"):
                try:
                    smtp.starttls()
                    smtp.ehlo("toolverai.com")
                except Exception:
                    pass
            smtp.mail(self.s.sender_email)
            for addr in addresses:
                try:
                    code, _ = smtp.rcpt(addr)
                except smtplib.SMTPServerDisconnected:
                    code = None
                codes.append(code)
        return codes

    def _api_verify(self, email: str) -> str | None:
        """Verify via ZeroBounce over HTTPS when EMAIL_VERIFY_API_KEY is set. Returns
        valid | invalid | catch_all | unknown, or None when no key / API error (so the
        caller falls back to the SMTP probe). Works even when port 25 is blocked."""
        key = getattr(self.s, "email_verify_api_key", "")
        if not key:
            return None
        try:
            r = requests.get("https://api.zerobounce.net/v2/validate",
                             params={"api_key": key, "email": email}, timeout=15)
            status = str(r.json().get("status") or "").lower()
        except Exception as exc:
            self.log(f"(email verify API error: {exc})")
            return None
        return {
            "valid": "valid", "invalid": "invalid",
            "catch-all": "catch_all", "catch_all": "catch_all",
            "spamtrap": "invalid", "abuse": "invalid", "do_not_mail": "invalid",
            "unknown": "unknown",
        }.get(status, "unknown")

    def probe(self, email: str) -> str:
        """Return valid | invalid | catch_all | unknown (never sends a message)."""
        api = self._api_verify(email)
        if api is not None:
            self.log(f"{email} → {api} (API verify)")
            return api
        domain = email.split("@", 1)[1]
        mxs = self.mx_hosts(domain)
        if not mxs:
            return "invalid"
        if not self.s.smtp_probe or self._port25 is False:
            return "unknown"
        rand = "".join(random.choices(string.ascii_lowercase + string.digits, k=14)) + "@" + domain
        for mx in mxs[:2]:
            try:
                code, rand_code = self._rcpt(mx, [email, rand])
                self._port25 = True
            except (OSError, smtplib.SMTPException, socket.timeout) as exc:
                if self._port25 is None and isinstance(exc, (TimeoutError, socket.timeout, ConnectionRefusedError)):
                    self._port25 = False
                    self.log("(outbound port 25 blocked — SMTP probes disabled for this run)")
                    return "unknown"
                continue
            if code is None:
                return "unknown"
            if 500 <= code < 600:
                return "invalid"
            if 200 <= code < 300:
                if rand_code is not None and 200 <= rand_code < 300:
                    self._catch_all[domain] = "yes"
                    return "catch_all"
                return "valid"
            return "unknown"  # 4xx greylisting etc.
        return "unknown"

    # ── scraping ─────────────────────────────────────────────────────────────
    @staticmethod
    def _decode_cfemail(hexstr: str) -> str:
        try:
            key = int(hexstr[:2], 16)
            return "".join(chr(int(hexstr[i:i + 2], 16) ^ key) for i in range(2, len(hexstr), 2))
        except ValueError:
            return ""

    def scrape(self, website: str) -> tuple[list[str], set[str]]:
        """Return (emails found, domains the site resolves to)."""
        found: list[str] = []
        domains: set[str] = set()
        if "://" not in website:
            website = "https://" + website
        origin_dom = safe_domain(website)
        origin = None
        session = requests.Session()
        session.headers.update(UA)
        for path in SCRAPE_PATHS:
            url = urljoin(origin or website, path) if path else website
            try:
                r = session.get(url, timeout=10, allow_redirects=True)
            except requests.RequestException:
                if not path:
                    break  # homepage unreachable
                continue
            final_host = urlparse(r.url).hostname or ""
            if final_host:
                final_dom = base_domain(final_host)
                if origin_dom and final_dom != origin_dom and not final_dom.endswith("." + origin_dom):
                    continue
                domains.add(final_dom)
                if origin is None:
                    origin = f"{urlparse(r.url).scheme}://{final_host}"
            if r.status_code >= 400 or "html" not in r.headers.get("content-type", ""):
                continue
            soup = BeautifulSoup(r.text, "html.parser")
            for a in soup.select("a[href^='mailto:']"):
                found.append(a["href"][7:].split("?")[0])
            for el in soup.select("[data-cfemail]"):
                found.append(self._decode_cfemail(el["data-cfemail"]))
            found.extend(EMAIL_RE.findall(soup.get_text(" ")))
        return found, domains

    # ── candidate ranking ────────────────────────────────────────────────────
    @staticmethod
    def clean(email: str) -> str:
        email = email.strip().strip(".,;:()<>[]\"'").lower()
        email = re.sub(r"^(u003e|u003c|%20|mailto:)+", "", email)
        return email

    def _acceptable(self, email: str, domains: set[str]) -> bool:
        if not STRICT_RE.match(email):
            return False
        local, dom = email.split("@", 1)
        if BLOCKED_LOCAL.match(local) or BLOCKED_DOMAIN.search(dom):
            return False
        return base_domain(dom) in domains

    @staticmethod
    def _rank(email: str) -> int:
        local = email.split("@", 1)[0]
        for pattern, score in LOCAL_PRIORITY:
            if pattern.match(local):
                return score
        # Looks like a person (first.last / first) — good for founders
        return 4 if re.match(r"^[a-z]+(\.[a-z]+)?$", local) else 5

    # ── main entry ───────────────────────────────────────────────────────────
    def find(self, tool_domain: str, website: str, previous: dict | None, tool_name: str = "") -> tuple[Contact | None, str]:
        if previous and previous.get("email") and previous.get("verification") in ("valid", "catch_all", "mx_only"):
            return Contact(**previous), "reused verified contact from log"

        self._load_stored()

        clean_dom = safe_domain(tool_domain or website)
        n_key = norm_name(tool_name)
        domains = {clean_dom} if clean_dom else set()

        # 1. Gather stored candidates from all sheets / DB
        stored_items: list[tuple[str, str]] = []
        if clean_dom and self._stored and clean_dom in self._stored:
            stored_items.extend(self._stored[clean_dom])
        if n_key and self._stored_by_name and n_key in self._stored_by_name:
            stored_items.extend(self._stored_by_name[n_key])

        # 2. Live scrape website
        scraped_raw, site_domains = self.scrape(website)
        domains |= site_domains
        scraped_items: list[tuple[str, str]] = [(e, "scraped") for e in scraped_raw]

        candidates: list[tuple[int, str, str]] = []
        seen: set[str] = set()

        for raw_email, source_desc in (stored_items + scraped_items):
            e = self.clean(raw_email)
            if not e or e in seen or not self._acceptable(e, domains):
                continue
            seen.add(e)
            candidates.append((self._rank(e), source_desc, e))

        # Prioritize verified hunting sheet and excel leads, then rank
        candidates.sort(key=lambda c: (
            0 if "Hunting" in c[1] else (1 if "Excel" in c[1] else 2),
            c[0],
            c[1] != "scraped"
        ))
        self.log(f"candidates: {[c[2] for c in candidates][:6] or 'none'}")

        for _, source, email in candidates[:5]:
            result = self.probe(email)
            self.log(f"{email} → {result}")
            if result == "invalid":
                continue
            verification = "mx_only" if result == "unknown" else result
            confidence = "high" if (result == "valid" or "Hunting" in source or "Excel" in source) else "medium"
            return Contact(email, source, verification, confidence), f"{source} ({result})"

        # 3. Role fallbacks on the primary mail domain
        mail_domain = clean_dom or safe_domain(tool_domain)
        if not mail_domain or not self.mx_hosts(mail_domain):
            return None, f"no MX records for {mail_domain or tool_domain}"
        for role in FALLBACK_ROLES:
            email = f"{role}@{mail_domain}"
            result = self.probe(email)
            self.log(f"{email} → {result}")
            if result == "valid":
                return Contact(email, "role_fallback", "valid", "medium"), "role fallback (SMTP verified)"
            # Catch-all domains accept every address at RCPT, so a *guessed* role on one
            # is a top bounce source — only use it when unverified fallback is explicitly on.
            if result == "catch_all" and self.s.allow_unverified_fallback:
                return Contact(email, "role_fallback", "catch_all", "low"), "role fallback (catch-all, unverified)"
            if result == "unknown" and self.s.allow_unverified_fallback:
                return Contact(email, "role_fallback", "mx_only", "low"), "role fallback (MX only, unverified)"
        return None, "no verifiable contact — manual review"
