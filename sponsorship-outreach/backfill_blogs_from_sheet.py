"""One-off (safe to re-run): copy each tool's Medium blog from the Google Sheet
into toolver_db.tools.blog, so the tool page can render it.

Until Nov 2026 the daily pipeline wrote the blog only to the sheet, so every
auto-imported tool page had no long-form content. Zero DeepSeek cost: it only
copies text that already exists. Blogs shorter than MIN_BLOG_WORDS are left
out; regenerate those with:  python repair_blogs.py --write

Usage:
  python backfill_blogs_from_sheet.py          # dry-run: show what would change
  python backfill_blogs_from_sheet.py --write  # write to the DB
"""
from __future__ import annotations

import argparse
import sys

import gspread
from google.oauth2.service_account import Credentials
from pymongo import MongoClient

from daily_tools_pipeline import (MIN_BLOG_WORDS, MONGO, NEW_COL_BLOG, SA_FILE, SHEET_ID,
                                  SHEET_TAB, slugify)

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="actually update the DB")
    args = ap.parse_args()

    db = MongoClient(MONGO["MONGODB_URI"], serverSelectionTimeoutMS=8000)[MONGO.get("MONGODB_DB_NAME", "toolver_db")]
    ws = gspread.authorize(Credentials.from_service_account_file(
        SA_FILE, scopes=["https://www.googleapis.com/auth/spreadsheets"])).open_by_key(SHEET_ID).worksheet(SHEET_TAB)
    vals = ws.get_all_values()
    col = vals[0].index(NEW_COL_BLOG)
    sheet_blogs = {}
    for r in vals[1:]:
        if r and r[0] and len(r) > col and r[col].strip():
            sheet_blogs[slugify(r[0])] = r[col].strip()

    filled, short, missing = 0, [], []
    for t in db["tools"].find({"$or": [{"blog": {"$exists": False}}, {"blog": ""}]}, {"name": 1, "slug": 1}):
        blog = sheet_blogs.get(t.get("slug") or slugify(t["name"]))
        if not blog:
            missing.append(t["name"]); continue
        if len(blog.split()) < MIN_BLOG_WORDS:
            short.append(f"{t['name']} ({len(blog.split())}w)"); continue
        if args.write:
            db["tools"].update_one({"_id": t["_id"]}, {"$set": {
                "blog": blog, "blog_model": "deepseek-v4-pro", "blog_source": "sheet-backfill"}})
        filled += 1

    print(f"{'Updated' if args.write else 'Would update'} {filled} tools with their sheet blog.")
    print(f"Too short (need repair_blogs.py --write): {len(short)}")
    for s in short:
        print("   -", s)
    print(f"No blog in sheet (manual/older tools): {len(missing)}")


if __name__ == "__main__":
    main()
