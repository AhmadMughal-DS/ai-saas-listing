"""Regenerate Medium blogs for all auto-imported tools using deepseek-v4-pro + web_search,
and update the Google Sheet's "Medium Blog" column (and store in toolver_db too).

Run AFTER the daily tool batch finishes (avoids racing on the sheet).
Usage: python regenerate_blogs.py [--limit N]
"""
from __future__ import annotations

import argparse
import sys
import time

import gspread
from google.oauth2.service_account import Credentials
from pymongo import MongoClient

from daily_tools_pipeline import (MONGO, SA_FILE, SHEET_ID, SHEET_TAB, NEW_COL_BLOG,
                                  write_blog, clean_url)

try:
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="0 = no limit")
    ap.add_argument("--all", action="store_true", help="ALL live tools (not just auto-imported)")
    ap.add_argument("--skip-done", action="store_true", help="skip tools that already have a v4-pro blog (resume)")
    args = ap.parse_args()

    db = MongoClient(MONGO["MONGODB_URI"], serverSelectionTimeoutMS=8000)[MONGO.get("MONGODB_DB_NAME", "toolver_db")]
    gc = gspread.authorize(Credentials.from_service_account_file(
        SA_FILE, scopes=["https://www.googleapis.com/auth/spreadsheets"]))
    ws = gc.open_by_key(SHEET_ID).worksheet(SHEET_TAB)

    vals = ws.get_all_values()
    header = vals[0]
    if NEW_COL_BLOG not in header:
        header.append(NEW_COL_BLOG)
        ws.update(range_name="A1", values=[header])
    blog_col = header.index(NEW_COL_BLOG) + 1  # 1-based
    name_to_row = {r[0].strip().lower(): i + 2 for i, r in enumerate(vals[1:]) if r and r[0]}

    query = {} if args.all else {"auto_imported": True}
    if args.skip_done:
        query["blog_model"] = {"$ne": "deepseek-v4-pro"}
    tools = list(db["tools"].find(query, {"name": 1, "slug": 1, "url": 1, "category": 1}))
    if args.limit:
        tools = tools[:args.limit]
    scope = "ALL live tools" if args.all else "auto-imported tools"
    print(f"Regenerating blogs for {len(tools)} {scope} (v4-pro + web_search, with ToolverAI backlinks)...\n")

    total_cost = 0.0; ok = 0; failed = 0
    MIN_WORDS = 400  # treat shorter output as a failed/truncated blog — don't mark done
    for i, t in enumerate(tools, 1):
        name = t["name"]; url = clean_url(t.get("url", "")); cat = t.get("category", "")
        ts = time.time()
        rb = {"tagline": "", "description": "", "key_features": [], "pros": [], "cons": []}
        toolver_page = f"https://toolverai.com/tool/{t.get('slug') or ''}".rstrip("/")
        try:
            blog, cost = write_blog(name, url, cat, rb, toolver_page=toolver_page)
            total_cost += cost
            words = len(blog.split())
            if words < MIN_WORDS:
                failed += 1
                print(f"[{i}/{len(tools)}] {name[:26]:26} SHORT ({words}w) — not marked done, will retry next run")
                time.sleep(2); continue
            # update DB (mark done only on a good blog)
            db["tools"].update_one({"_id": t["_id"]}, {"$set": {"blog": blog, "blog_model": "deepseek-v4-pro"}})
            row = name_to_row.get(name.strip().lower())
            sheet_status = "no sheet row"
            if row:
                try:
                    ws.update_cell(row, blog_col, blog)
                    sheet_status = f"sheet row {row}"
                except Exception as exc:
                    sheet_status = f"sheet err {type(exc).__name__}"
            ok += 1
            print(f"[{i}/{len(tools)}] {name[:26]:26} ~{words}w  ({round(time.time()-ts)}s ${round(cost,4)}) {sheet_status}")
        except Exception as exc:
            failed += 1
            print(f"[{i}/{len(tools)}] {name[:26]:26} ERROR {type(exc).__name__}: {str(exc)[:60]} — skipped")
            time.sleep(3)  # back off on network blips
        time.sleep(1)  # gentle on Sheets API

    print(f"\n==== done: {ok} ok, {failed} failed/short | est cost ${round(total_cost,3)} ====")


if __name__ == "__main__":
    main()
