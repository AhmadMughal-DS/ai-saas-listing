"""Re-add tools that the outreach sheet lists as live but whose listing page 404s.

Background (2026-11-10): 102 of the 113 tools already emailed had a "live listing" URL
that returned 404, because the tool was in the Google Sheet (so the daily pipeline
treats it as existing and never imports it) but not in toolver_db.tools.

For every outreach record whose live_page is not HTTP 200 this script runs the same
steps as daily_tools_pipeline (scrape -> category -> logo -> schema-valid doc) and
inserts the doc under the slug the outreach emails already point at. It never
overwrites an existing tool ($setOnInsert) and never appends to the Sheet.

Default is DRY-RUN. Usage:
  python restore_missing_tools.py                    # list what is missing
  python restore_missing_tools.py --limit 3 --db     # restore 3, live
  python restore_missing_tools.py --db               # restore everything missing
  python restore_missing_tools.py --only veed-io,notion-ai --db
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

import requests

import daily_tools_pipeline as p
import listing_sync
import logo_utils

BASE = Path(__file__).resolve().parent
LOG = BASE / "outreach-log.json"
REPORT = BASE / "restore_missing_tools.log"
UA = {"User-Agent": "ToolverAI-restore-precheck"}


def page_status(url: str) -> int:
    try:
        return requests.get(url, headers=UA, timeout=20, allow_redirects=False).status_code
    except Exception:
        return -1


def parse_traffic(text: str) -> tuple[int, str] | None:
    m = re.fullmatch(r"\s*([\d.]+)\s*([KMB])\s*", str(text or ""), re.I)
    if not m:
        return None
    mult = {"K": 1e3, "M": 1e6, "B": 1e9}[m.group(2).upper()]
    return int(float(m.group(1)) * mult), f"{m.group(1)}{m.group(2).upper()}"


def missing_tools(only: set[str]) -> list[dict]:
    data = json.loads(LOG.read_text(encoding="utf-8"))
    on_site = listing_sync.live_slugs()
    if on_site is None:
        print("Could not read the website sitemap — not restoring anything this run.")
        return []
    blocked = p.do_not_restore()
    out = []
    for key, rec in data["tools"].items():
        live_page = (rec.get("live_page") or "").rstrip("/")
        slug = listing_sync.slug_of(live_page)
        if not slug or not rec.get("website") or (only and slug not in only):
            continue
        if slug in on_site or slug in blocked or str(rec.get("tool_name", "")).strip().lower() in blocked:
            continue
        out.append({"key": key, "slug": slug, "name": rec.get("tool_name") or key, "url": p.clean_url(rec["website"]),
                    "live_page": live_page, "traffic": rec.get("traffic", ""), "emailed": bool(rec.get("messages")),
                    "seed_features": rec.get("features") or []})
    out.sort(key=lambda t: (not t["emailed"], t["slug"]))   # companies we already emailed go first
    return [t for t in out if page_status(t["live_page"]) == 404]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="max tools to restore (0 = all)")
    ap.add_argument("--only", default="", help="comma-separated slugs")
    ap.add_argument("--db", action="store_true", help="insert into toolver_db.tools (LIVE on website)")
    args = ap.parse_args()

    todo = missing_tools({s.strip() for s in args.only.split(",") if s.strip()})
    print(f"{len(todo)} listing(s) return 404 ({sum(t['emailed'] for t in todo)} already emailed).")
    if args.limit:
        todo = todo[:args.limit]
    if not args.db:
        for t in todo:
            print(f"  {'EMAILED' if t['emailed'] else '       '} {t['slug']:34} {t['url']}")
        print("\nDRY-RUN — nothing written. Add --db to restore.")
        return

    from pymongo import MongoClient
    db = MongoClient(p.MONGO["MONGODB_URI"], serverSelectionTimeoutMS=8000)[p.MONGO.get("MONGODB_DB_NAME", "toolver_db")]
    cfg = {"llm": {"api_key": p.DEEPSEEK_KEY, "model": "deepseek/deepseek-chat", "temperature": 0},
           "verbose": False, "headless": True, "loader_kwargs": {"timeout": 20000}}

    done, skipped, cost_total = [], [], 0.0
    with REPORT.open("a", encoding="utf-8") as rep:
        rep.write(f"\n=== restore run {p.now_iso()} — {len(todo)} tool(s) ===\n")
        for i, t in enumerate(todo, 1):
            ts = time.time()
            try:
                if db["tools"].find_one({"$or": [{"slug": t["slug"]}, {"id": f"tool-{t['slug']}"}]}, {"_id": 1}):
                    line = f"[{i}/{len(todo)}] {t['slug']:30} already in DB — left untouched"
                    print(line); rep.write(line + "\n"); continue
                rb, c1 = p.research(t["name"], t["url"], "", cfg)
                # A failed scrape leaves nothing real to publish: skip rather than put up an empty page.
                if rb["_scrape_error"] or len(rb["description"]) < 60 or len(rb["key_features"]) < 3:
                    why = rb["_scrape_error"] or "scrape returned too little content"
                    skipped.append((t["slug"], why))
                    line = f"[{i}/{len(todo)}] {t['slug']:30} SKIPPED ({why})"
                    print(line); rep.write(line + "\n"); rep.flush(); continue
                cat, c2 = p.classify_category(t["name"], rb["description"])
                s3url, lnote = logo_utils.ensure_logo(t["slug"], t["url"])
                if s3url:
                    rb["logo_url"] = s3url
                doc = p.build_doc(t["name"], t["url"], cat, rb, "")
                doc.update({"id": f"tool-{t['slug']}", "slug": t["slug"], "source": "restore-2026-11-10"})
                traffic = parse_traffic(t["traffic"])
                if traffic:                      # keep the figure the sheet/CRM already shows for this tool
                    doc["monthlyVisits"], doc["monthlyVisitsFormatted"] = traffic
                db["tools"].update_one({"id": doc["id"]}, {"$setOnInsert": doc}, upsert=True)
                cost_total += c1 + c2
                done.append(t["slug"])
                line = (f"[{i}/{len(todo)}] {t['slug']:30} {cat:16} {rb['pricing_type']:10} "
                        f"feat:{len(rb['key_features'])} logo:{lnote[:20]:20} ({round(time.time() - ts, 1)}s) LIVE")
                print(line); rep.write(line + "\n"); rep.flush()
            except Exception as exc:
                skipped.append((t["slug"], f"{type(exc).__name__}: {str(exc)[:100]}"))
                line = f"[{i}/{len(todo)}] {t['slug']:30} SKIPPED -> {type(exc).__name__}: {str(exc)[:120]}"
                print(line); rep.write(line + "\n"); rep.flush()

        summary = f"==== restored {len(done)} | skipped {len(skipped)} | DeepSeek cost ${round(cost_total, 4)} ===="
        print("\n" + summary); rep.write(summary + "\n")
        if done:
            ping = p.indexnow_ping([f"{p.SITE_URL}/tool/{s}" for s in done])
            print(f"[indexnow] {ping}"); rep.write(f"[indexnow] {ping}\n")
        if skipped:
            print("Skipped:", ", ".join(s for s, _ in skipped))


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
