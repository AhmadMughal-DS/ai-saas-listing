"""Listing sync — the one place that answers "is this tool live on toolverai.com?".

Source of truth = the website itself (its sitemap is built from toolver_db.tools on
every request). The Google Sheet and outreach-log.json only *claim* a listing URL;
this module checks the claim and stamps each outreach record with:

    listing_live        True / False
    listing_checked_at  ISO timestamp

Outreach (discover, queue, follow-ups) only touches records with listing_live=True,
so an email can never again point a company at a 404 page.

CLI:
  python listing_sync.py            # report only
  python listing_sync.py --write    # stamp outreach-log.json
"""
from __future__ import annotations

import re
import sys
import urllib.request
from datetime import datetime, timezone

SITEMAP_URL = "https://toolverai.com/sitemap.xml"
MIN_EXPECTED_TOOLS = 50   # a sitemap with fewer tool URLs than this is treated as a failed fetch


def slug_of(live_page: str) -> str:
    live_page = (live_page or "").strip().rstrip("/")
    return live_page.rsplit("/tool/", 1)[-1].lower() if "/tool/" in live_page else ""


def live_slugs(timeout: int = 30) -> set[str] | None:
    """Slugs of every tool page the website currently serves. None = could not tell
    (site down / bad response) — callers must then NOT change any listing_live flag."""
    try:
        req = urllib.request.Request(f"{SITEMAP_URL}?t={int(datetime.now().timestamp())}",
                                     headers={"User-Agent": "ToolverAI-listing-sync"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            xml = resp.read().decode("utf-8", "replace")
    except Exception:
        return None
    slugs = {m.lower().rstrip("/") for m in re.findall(r"<loc>https?://[^<]*/tool/([^<]+)</loc>", xml)}
    return slugs if len(slugs) >= MIN_EXPECTED_TOOLS else None


def apply(tools: dict, slugs: set[str] | None = None) -> dict:
    """Stamp listing_live on every outreach record. Returns counts."""
    if slugs is None:
        slugs = live_slugs()
    if slugs is None:
        return {"ok": False, "live": 0, "missing": 0, "missing_keys": []}
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    live = 0
    missing: list[str] = []
    for key, rec in tools.items():
        is_live = slug_of(rec.get("live_page", "")) in slugs
        rec["listing_live"] = is_live
        rec["listing_checked_at"] = now
        if is_live:
            live += 1
        else:
            missing.append(key)
    return {"ok": True, "live": live, "missing": len(missing), "missing_keys": missing}


def is_live(rec: dict) -> bool:
    """Queue gate. A record that was never checked is NOT sendable."""
    return rec.get("listing_live") is True


if __name__ == "__main__":
    import store as st
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    s = st.Store()
    res = apply(s.tools)
    if not res["ok"]:
        print("Could not read the website sitemap — nothing changed.")
        sys.exit(1)
    print(f"Outreach records: {len(s.tools)} | listing live: {res['live']} | listing missing: {res['missing']}")
    for k in res["missing_keys"]:
        print(f"  missing: {k:34} status={s.tools[k]['status']}")
    if "--write" in sys.argv:
        with st.RunLock():
            s.save()
        print("Saved to outreach-log.json.")
