"""Free, credit-free bulk email scraper for the full lead database.

Scrapes each `sponsorship_leads` tool's own website (homepage + /contact + /about) for
on-page emails and stores them back on the lead document. Uses NO paid finder or
verification APIs — that spend is reserved for tools actually being published and emailed.
Resumable: every processed lead is flagged `scrape_attempted`, so re-runs only touch new
leads. Store-only; verification happens later, at send time, for the published subset.

    python bulk_scrape_leads.py --limit 30      # test on 30 leads
    python bulk_scrape_leads.py                 # full run (all remaining)
    python bulk_scrape_leads.py --workers 24    # tune concurrency
"""
from __future__ import annotations

import argparse
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient, UpdateOne

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import load_settings
from contacts import (EMAIL_RE, STRICT_RE, BLOCKED_LOCAL, BLOCKED_DOMAIN,
                      base_domain, safe_domain)

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
PATHS = ["", "/contact", "/contact-us", "/about", "/about-us"]


def _decode_cf(hexstr: str) -> str:
    try:
        key = int(hexstr[:2], 16)
        return "".join(chr(int(hexstr[i:i + 2], 16) ^ key) for i in range(2, len(hexstr), 2))
    except ValueError:
        return ""


def scrape_emails(url: str) -> list[str]:
    """Return on-domain, non-blocked emails scraped from the site (free, no API)."""
    dom = safe_domain(url)
    if not dom:
        return []
    if "://" not in url:
        url = "https://" + url
    found: list[str] = []
    seen: set[str] = set()
    sess = requests.Session()
    sess.headers.update(UA)
    origin = None
    for path in PATHS:
        u = urljoin(origin or url, path) if path else url
        try:
            r = sess.get(u, timeout=8, allow_redirects=True)
        except requests.RequestException:
            if not path:
                break  # homepage unreachable -> give up on this site
            continue
        host = urlparse(r.url).hostname or ""
        if host and origin is None:
            origin = f"{urlparse(r.url).scheme}://{host}"
        if r.status_code >= 400 or "html" not in r.headers.get("content-type", ""):
            continue
        soup = BeautifulSoup(r.text, "html.parser")
        cands = [a["href"][7:].split("?")[0] for a in soup.select("a[href^='mailto:']")]
        cands += [_decode_cf(el.get("data-cfemail", "")) for el in soup.select("[data-cfemail]")]
        cands += EMAIL_RE.findall(soup.get_text(" "))
        for e in cands:
            e = e.strip().strip(".,;:()<>[]\"'").lower()
            if not e or e in seen or not STRICT_RE.match(e):
                continue
            local, d = e.split("@", 1)
            if BLOCKED_LOCAL.match(local) or BLOCKED_DOMAIN.search(d) or base_domain(d) != dom:
                continue
            seen.add(e)
            found.append(e)
    return found[:5]


def main() -> None:
    ap = argparse.ArgumentParser(description="Free bulk email scraper for sponsorship_leads")
    ap.add_argument("--limit", type=int, default=0, help="Max leads this run (0 = all remaining)")
    ap.add_argument("--workers", type=int, default=16, help="Parallel scrape threads")
    args = ap.parse_args()

    s = load_settings()
    cli = MongoClient(s.mongodb_uri, serverSelectionTimeoutMS=15000)
    col = cli[s.mongodb_db]["sponsorship_leads"]

    query = {"emails.0": {"$exists": False}, "scrape_attempted": {"$ne": True},
             "url": {"$exists": True, "$nin": ["", None]}}
    cur = col.find(query, {"_id": 1, "url": 1, "name": 1})
    if args.limit:
        cur = cur.limit(args.limit)
    docs = list(cur)
    print(f"[*] {len(docs)} leads to scrape (workers={args.workers}) — NO API credits used", flush=True)

    processed = found_count = 0
    ops: list[UpdateOne] = []
    t0 = time.time()

    def work(doc: dict):
        try:
            return doc["_id"], scrape_emails(doc.get("url", ""))
        except Exception:
            return doc["_id"], []

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        for _id, emails in ex.map(work, docs):
            processed += 1
            setf = {"scrape_attempted": True, "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S")}
            if emails:
                setf["emails"] = emails
                setf["email_source"] = "bulk_scrape"
                found_count += 1
            ops.append(UpdateOne({"_id": _id}, {"$set": setf}))
            if len(ops) >= 200:
                col.bulk_write(ops, ordered=False)
                ops = []
            if processed % 100 == 0:
                rate = processed / max(1, time.time() - t0)
                print(f"    {processed}/{len(docs)} · {found_count} emails found · "
                      f"{rate:.1f}/s · {int(time.time() - t0)}s", flush=True)

    if ops:
        col.bulk_write(ops, ordered=False)
    print(f"[DONE] processed {processed} · emails found for {found_count} "
          f"({100 * found_count // max(1, processed)}%) · {int(time.time() - t0)}s", flush=True)
    cli.close()


if __name__ == "__main__":
    main()
