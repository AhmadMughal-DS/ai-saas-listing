"""Test-batch verified-email finder.

Reads the main lead file, picks tools that have a website but no email yet,
uses ScrapeGraphAI + DeepSeek to extract candidate contact emails from the
live site (homepage -> /contact -> /about), then verifies each candidate with
MX lookup + SMTP RCPT probe. Writes a JSON + CSV report to the scratchpad.

Nothing is written back to the Excel/sheet and NO outreach email is sent.
Usage:  python find_emails_batch.py --limit 40
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import smtplib
import socket
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import dns.resolver
import openpyxl
import requests
from dotenv import dotenv_values
from scrapegraphai.graphs import SmartScraperGraph

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# DeepSeek pricing (USD per 1M tokens) — scrapegraphai doesn't price DeepSeek itself.
DS_IN_PER_M = 0.27
DS_OUT_PER_M = 1.10

EXCEL = Path(r"D:\company page\client data scrape-toolverai\all_ai_tools_leads_combined.xlsx")
TAB = "All Combined Leads"
OUT_DIR = Path(r"C:\Users\HP\AppData\Local\Temp\claude\D--company-page-ai-saas-listing\e524d964-f78e-4343-a1b0-e66704866cdd\scratchpad")
ROOT_ENV = Path(r"D:\company page\ai-saas-listing\.env")
SUB_ENV = Path(__file__).with_name(".env")

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,24}")
JUNK_DOMAINS = {"example.com", "domain.com", "email.com", "sentry.io", "wixpress.com", "initml.co"}
JUNK_LOCAL = re.compile(r"^(no[\-.]?reply|noreply|unknown|user|name|your|abuse|postmaster)$", re.I)


def load_key(name: str = "DEEPSEEK_API_KEY", required: bool = True) -> str:
    for env in (SUB_ENV, ROOT_ENV):
        v = dotenv_values(env).get(name)
        if v:
            return v
    if required:
        sys.exit(f"NO {name}")
    return ""


ZB_KEY = ""


def zerobounce_verify(email: str) -> str:
    """ZeroBounce HTTPS validation (works through port-25 block).
    Returns ZeroBounce status: valid | invalid | catch-all | unknown | spamtrap | abuse | do_not_mail | error."""
    if not ZB_KEY:
        return "no_api_key"
    try:
        r = requests.get("https://api.zerobounce.net/v2/validate",
                         params={"api_key": ZB_KEY, "email": email, "ip_address": ""}, timeout=25)
        if r.status_code != 200:
            return f"http_{r.status_code}"
        return (r.json().get("status") or "unknown").lower()
    except Exception as exc:
        return f"error:{type(exc).__name__}"


def norm_url(u: str) -> str | None:
    u = (u or "").strip()
    if not u:
        return None
    if not u.startswith("http"):
        u = "https://" + u
    return u


def pick_tools(limit: int) -> list[dict]:
    wb = openpyxl.load_workbook(EXCEL, read_only=True)
    ws = wb[TAB]
    rows = ws.iter_rows(values_only=True)
    next(rows)  # header
    out = []
    for r in rows:
        name, site, allmail, e1 = r[0], r[3], r[4], r[5]
        has_email = bool((allmail and str(allmail).strip()) or (e1 and str(e1).strip()))
        url = norm_url(str(site) if site else "")
        if name and url and not has_email:
            out.append({"name": str(name).strip(), "category": r[1], "url": url})
        if len(out) >= limit:
            break
    return out


def valid_email(addr: str) -> bool:
    addr = addr.lower().strip()
    if not EMAIL_RE.fullmatch(addr):
        return False
    local, dom = addr.split("@", 1)
    if dom in JUNK_DOMAINS or JUNK_LOCAL.match(local):
        return False
    if len(local) > 40:  # obfuscated / relay junk
        return False
    return True


_mx_cache: dict[str, list[str]] = {}


def mx_hosts(domain: str) -> list[str]:
    if domain in _mx_cache:
        return _mx_cache[domain]
    hosts: list[str] = []
    try:
        ans = dns.resolver.resolve(domain, "MX", lifetime=6)
        hosts = [str(r.exchange).rstrip(".") for r in sorted(ans, key=lambda x: x.preference)]
    except Exception:
        try:  # fall back to A record (implicit MX)
            dns.resolver.resolve(domain, "A", lifetime=6)
            hosts = [domain]
        except Exception:
            hosts = []
    _mx_cache[domain] = hosts
    return hosts


def rcpt_verify(email: str) -> str:
    """Return: valid | invalid | catch_all | mx_only(port25 blocked/unknown) | no_mx"""
    domain = email.split("@", 1)[1]
    hosts = mx_hosts(domain)
    if not hosts:
        return "no_mx"
    rand = f"zzq8x7never{int(time.time())}@{domain}"
    for mx in hosts[:2]:
        try:
            s = smtplib.SMTP(timeout=12)
            s.connect(mx, 25)
            s.helo("toolverai.com")
            s.mail("partnership@toolverai.com")
            code_real, _ = s.rcpt(email)
            code_fake, _ = s.rcpt(rand)
            s.quit()
            if code_real in (250, 251):
                return "catch_all" if code_fake in (250, 251) else "valid"
            if code_real in (550, 551, 553, 501, 552):
                return "invalid"
            return "mx_only"
        except (socket.timeout, OSError, smtplib.SMTPException):
            continue
    return "mx_only"  # port 25 likely blocked from this host


def scrape_emails(url: str, cfg: dict) -> tuple[list[str], float, dict]:
    """Try homepage then /contact then /about; return (emails, llm_cost_usd, info)."""
    base = f"{urlparse(url).scheme}://{urlparse(url).hostname}"
    paths = ["", "/contact", "/about"]
    seen: set[str] = set()
    cost = 0.0
    info_acc = {"calls": 0}
    for p in paths:
        target = base + p if p else url
        try:
            g = SmartScraperGraph(
                prompt=("Extract every contact, partnership, support, press or sales EMAIL ADDRESS "
                        "visible anywhere on this page. Return strictly JSON: {\"emails\": [list of emails]}. "
                        "If none, return {\"emails\": []}."),
                source=target,
                config=cfg,
            )
            res = g.run()
            info_acc["calls"] += 1
            try:
                ei = g.get_execution_info()
                for row in (ei or []):
                    pt = float(row.get("prompt_tokens", 0) or 0)
                    ct = float(row.get("completion_tokens", 0) or 0)
                    priced = float(row.get("total_cost_USD", 0) or 0)
                    cost += priced if priced else (pt / 1e6 * DS_IN_PER_M + ct / 1e6 * DS_OUT_PER_M)
            except Exception:
                pass
            emails = []
            if isinstance(res, dict):
                emails = res.get("emails") or (res.get("content") or {}).get("emails") or []
            if isinstance(emails, str):
                emails = EMAIL_RE.findall(emails)
            for e in emails:
                if isinstance(e, str) and valid_email(e):
                    seen.add(e.lower().strip())
        except Exception as exc:
            info_acc.setdefault("errors", []).append(f"{p or '/'}: {type(exc).__name__}")
        if seen:  # stop at first page that yields a usable email
            break
    return sorted(seen), cost, info_acc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=40)
    args = ap.parse_args()

    global ZB_KEY
    key = load_key("DEEPSEEK_API_KEY")
    ZB_KEY = load_key("EMAIL_VERIFY_API_KEY", required=False)
    print("ZeroBounce verify:", "ENABLED" if ZB_KEY else "DISABLED (MX-only fallback)")
    cfg = {
        "llm": {"api_key": key, "model": "deepseek/deepseek-chat", "temperature": 0},
        "verbose": False,
        "headless": True,
        "loader_kwargs": {"timeout": 20000},
    }
    tools = pick_tools(args.limit)
    print(f"Picked {len(tools)} tools (website present, no email). Starting...\n")

    results = []
    t0 = time.time()
    total_cost = 0.0
    for i, t in enumerate(tools, 1):
        ts = time.time()
        emails, cost, info = scrape_emails(t["url"], cfg)
        total_cost += cost
        verified = []
        for e in emails:
            v = zerobounce_verify(e) if ZB_KEY else rcpt_verify(e)
            verified.append({"email": e, "verify": v})
        best = next((x["email"] for x in verified if x["verify"] == "valid"), "")
        if not best:
            best = next((x["email"] for x in verified if x["verify"] in ("catch-all", "catch_all", "mx_only", "unknown")), "")
        row = {
            "name": t["name"], "category": t["category"], "url": t["url"],
            "emails_found": emails, "verified": verified, "best_email": best,
            "llm_cost_usd": round(cost, 5), "secs": round(time.time() - ts, 1),
            "errors": info.get("errors", []),
        }
        results.append(row)
        status = "OK: " + best if best else "-- none"
        print(f"[{i:>2}/{len(tools)}] {t['name'][:30]:30} {status}  ({row['secs']}s, ${row['llm_cost_usd']})")

    elapsed = time.time() - t0
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "email_batch_results.json").write_text(
        json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    with (OUT_DIR / "email_batch_results.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["Tool Name", "Category", "Website", "Best Email", "All Found", "Verify", "Cost USD", "Secs"])
        for r in results:
            w.writerow([r["name"], r["category"], r["url"], r["best_email"],
                        "; ".join(r["emails_found"]),
                        "; ".join(f'{v["email"]}={v["verify"]}' for v in r["verified"]),
                        r["llm_cost_usd"], r["secs"]])

    found = sum(1 for r in results if r["emails_found"])
    valid_cnt = sum(1 for r in results if any(v["verify"] == "valid" for v in r["verified"]))
    print("\n================ SUMMARY ================")
    print(f"Tools processed      : {len(results)}")
    print(f"Email(s) found       : {found}  ({found*100//max(len(results),1)}%)")
    print(f"RCPT-verified 'valid': {valid_cnt}")
    print(f"Total DeepSeek cost  : ${round(total_cost,4)}  (avg ${round(total_cost/max(len(results),1),5)}/tool)")
    print(f"Total time           : {round(elapsed/60,1)} min  (avg {round(elapsed/max(len(results),1),1)}s/tool)")
    print(f"Est. for 12,191 tools: ${round(total_cost/max(len(results),1)*12191,2)} , "
          f"~{round(elapsed/max(len(results),1)*12191/3600,1)} h single-threaded")
    print(f"\nReports: {OUT_DIR / 'email_batch_results.csv'}")


if __name__ == "__main__":
    main()
