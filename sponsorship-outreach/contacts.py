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
    source: str            # log | stored_lead | scraped | role_fallback | Hunter.io | Apollo | Snov.io
    verification: str      # valid | catch_all | unknown | mx_only
    confidence: str        # high | medium | low
    person: str = ""       # decision-maker name, when a finder provides it
    title: str = ""        # CEO / CTO / Marketing Head, when known
    confidence_score: str = ""  # finder's own numeric score, e.g. "95%"

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
            data = r.json()
            status = str(data.get("status") or "").lower()
            sub = str(data.get("sub_status") or "").lower()
        except Exception as exc:
            self.log(f"(email verify API error: {exc})")
            return None
        if status == "valid":
            return "valid"
        if status in ("catch-all", "catch_all"):
            return "catch_all"
        if status == "invalid":
            return "invalid"
        if status == "do_not_mail":
            # Role inboxes (partnerships@, marketing@, hello@) are flagged do_not_mail/role_based
            # but they are exactly our outreach targets and do deliver — accept them.
            # Spamtraps / abuse / disposable / toxic addresses genuinely must be avoided.
            return "valid" if sub == "role_based" else "invalid"
        return "unknown"  # greylisted / no-status / out of credits -> fall back to SMTP probe

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

    # ── external email-finder providers (waterfall; each no-ops without its key) ──
    def _hunter_find(self, domain: str, tool_name: str) -> list[dict]:
        key = getattr(self.s, "hunter_api_key", "")
        if not key:
            return []
        r = requests.get("https://api.hunter.io/v2/domain-search",
                         params={"domain": domain, "api_key": key, "limit": 10}, timeout=20)
        out: list[dict] = []
        for em in (r.json().get("data") or {}).get("emails", []):
            email = str(em.get("value") or "").strip()
            if not email:
                continue
            person = " ".join(x for x in (em.get("first_name"), em.get("last_name")) if x).strip()
            score = em.get("confidence")
            out.append({"email": email, "source": "Hunter.io", "person": person,
                        "title": em.get("position") or "", "score": f"{score}%" if score is not None else ""})
        self.log(f"Hunter.io → {len(out)} candidate(s) for {domain}")
        return out

    def _apollo_find(self, domain: str, tool_name: str) -> list[dict]:
        key = getattr(self.s, "apollo_api_key", "")
        if not key:
            return []
        r = requests.post(
            "https://api.apollo.io/v1/mixed_people/search",
            headers={"Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": key},
            json={"q_organization_domains": domain, "page": 1, "per_page": 10,
                  "person_titles": ["Founder", "Co-Founder", "CEO", "CTO", "Chief Marketing Officer",
                                    "Head of Marketing", "VP Marketing", "Marketing Director",
                                    "Head of Partnerships", "Head of Growth"]},
            timeout=25)
        out: list[dict] = []
        for p in r.json().get("people", []):
            email = str(p.get("email") or "").strip()
            if not email or "email_not_unlocked" in email or email.endswith("@domain.com"):
                continue
            out.append({"email": email, "source": "Apollo", "person": (p.get("name") or "").strip(),
                        "title": p.get("title") or "", "score": ""})
        self.log(f"Apollo → {len(out)} candidate(s) for {domain}")
        return out

    def _snov_find(self, domain: str, tool_name: str) -> list[dict]:
        cid = getattr(self.s, "snov_client_id", "")
        secret = getattr(self.s, "snov_client_secret", "")
        if not (cid and secret):
            return []
        tok = requests.post("https://api.snov.io/v1/oauth/access_token",
                            data={"grant_type": "client_credentials", "client_id": cid,
                                  "client_secret": secret}, timeout=20).json().get("access_token")
        if not tok:
            return []
        r = requests.get("https://api.snov.io/v2/domain-emails-with-info",
                         params={"domain": domain, "type": "all", "limit": 10, "access_token": tok}, timeout=25)
        out: list[dict] = []
        for em in r.json().get("emails", []):
            email = str(em.get("email") or "").strip()
            if not email:
                continue
            person = " ".join(x for x in (em.get("firstName"), em.get("lastName")) if x).strip()
            out.append({"email": email, "source": "Snov.io", "person": person,
                        "title": em.get("position") or "", "score": ""})
        self.log(f"Snov.io → {len(out)} candidate(s) for {domain}")
        return out

    def _run_finders(self, domain: str, tool_name: str) -> list[dict]:
        """Query external finders in order; combine their decision-maker candidates.
        Only providers whose API key is set actually run; all errors are swallowed."""
        if not domain:
            return []
        items: list[dict] = []
        for fn in (self._hunter_find, self._apollo_find, self._snov_find):
            try:
                items.extend(fn(domain, tool_name))
            except Exception as exc:
                self.log(f"({fn.__name__} error: {exc})")
        return items

    def _try_candidates(self, items: list[dict], domains: set[str], max_try: int = 6) -> tuple[Contact | None, str]:
        """Clean, filter, rank and SMTP/API-verify a pool of candidate dicts.
        Returns the first deliverable Contact (carrying person/title/score) or (None, '')."""
        cands: list[tuple[int, dict, str]] = []
        seen: set[str] = set()
        for it in items:
            e = self.clean(it.get("email", ""))
            if not e or e in seen or not self._acceptable(e, domains):
                continue
            seen.add(e)
            cands.append((self._rank(e), it, e))
        cands.sort(key=lambda c: (
            0 if "Hunting" in c[1]["source"] else (1 if "Excel" in c[1]["source"] else (2 if c[1].get("title") else 3)),
            c[0],
            c[1]["source"] == "scraped",
        ))
        self.log(f"candidates: {[c[2] for c in cands][:6] or 'none'}")
        for _, it, email in cands[:max_try]:
            result = self.probe(email)
            self.log(f"{email} → {result}")
            if result == "invalid":
                continue
            verification = "mx_only" if result == "unknown" else result
            strong = result == "valid" or "Hunting" in it["source"] or "Excel" in it["source"] or bool(it.get("title"))
            contact = Contact(email, it["source"], verification, "high" if strong else "medium",
                              it.get("person", ""), it.get("title", ""), str(it.get("score", "")))
            return contact, f"{it['source']} ({result})"
        return None, ""

    # ── main entry ───────────────────────────────────────────────────────────
    def find(self, tool_domain: str, website: str, previous: dict | None, tool_name: str = "") -> tuple[Contact | None, str]:
        if previous and previous.get("email") and previous.get("verification") in ("valid", "catch_all", "mx_only"):
            return Contact(**previous), "reused verified contact from log"

        self._load_stored()

        clean_dom = safe_domain(tool_domain or website)
        n_key = norm_name(tool_name)
        domains = {clean_dom} if clean_dom else set()

        # 1. Free sources first: stored verified leads (sheets / Excel / Mongo) + live site scrape
        stored_raw: list[tuple[str, str]] = []
        if clean_dom and self._stored and clean_dom in self._stored:
            stored_raw.extend(self._stored[clean_dom])
        if n_key and self._stored_by_name and n_key in self._stored_by_name:
            stored_raw.extend(self._stored_by_name[n_key])

        scraped_raw, site_domains = self.scrape(website)
        domains |= site_domains

        free_items = (
            [{"email": e, "source": s, "person": "", "title": "", "score": ""} for e, s in stored_raw]
            + [{"email": e, "source": "scraped", "person": "", "title": "", "score": ""} for e in scraped_raw]
        )
        contact, note = self._try_candidates(free_items, domains)
        if contact:
            return contact, note

        # 2. External finders (Hunter → Apollo → Snov) — run only when the free sources came up
        #    empty, to conserve limited API credits. They target named decision-makers
        #    (founder / CTO / marketing head) and carry person + title + source + confidence.
        mail_domain = clean_dom or safe_domain(tool_domain)
        finder_items = self._run_finders(mail_domain, tool_name)
        if finder_items:
            if mail_domain:
                domains.add(mail_domain)
            contact, note = self._try_candidates(finder_items, domains)
            if contact:
                return contact, note

        # 3. Role fallbacks on the primary mail domain (last resort)
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
