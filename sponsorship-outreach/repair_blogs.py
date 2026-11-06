"""Repair tool pages that have no long-form blog (or only a thin one).

For every tool in toolver_db.tools whose `blog` is missing or shorter than
MIN_BLOG_WORDS:
  1. If the Google Sheet already holds a long-enough blog for it, copy that
     (free — no DeepSeek call).
  2. Otherwise generate a fresh blog with the pipeline's write_blog() (DeepSeek,
     ~$0.03-0.06 per tool), grounded on the tool's DB fields, and write it to the
     DB and back into the Sheet's blog cell.

Safe to re-run: tools that already have a good blog are skipped.

Usage:
  python repair_blogs.py                     # dry-run: list what would change
  python repair_blogs.py --write             # apply (sheet copies + regenerate)
  python repair_blogs.py --write --no-generate   # sheet copies only, zero cost
  python repair_blogs.py --write --max-cost 1.5  # stop generating past $1.50
"""
from __future__ import annotations

import argparse
import sys
import time

import gspread
from google.oauth2.service_account import Credentials
from pymongo import MongoClient

from daily_tools_pipeline import (MIN_BLOG_WORDS, MONGO, NEW_COL_BLOG, SA_FILE, SHEET_ID,
                                  SHEET_TAB, blog_fields, slugify, write_blog)

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def words(s: str) -> int:
    return len((s or "").split())


def research_blob(t: dict) -> dict:
    return {
        "tagline": t.get("tagline", ""), "description": t.get("description", ""),
        "pricing_type": t.get("pricingType", ""),
        "key_features": t.get("keyFeatures") or t.get("features") or [],
        "pros": t.get("pros", []), "cons": t.get("cons", []),
        "platforms": t.get("platforms", []), "target_audience": t.get("targetAudience", []),
        "has_api": t.get("hasApi", False), "is_open_source": t.get("isOpenSource", False),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="actually update DB + Sheet")
    ap.add_argument("--no-generate", action="store_true", help="only copy blogs that exist in the Sheet")
    ap.add_argument("--max-cost", type=float, default=3.0, help="stop generating once DeepSeek spend passes this ($)")
    ap.add_argument("--skip-done", action="store_true", help="(default behaviour; kept for compatibility)")
    args = ap.parse_args()

    db = MongoClient(MONGO["MONGODB_URI"], serverSelectionTimeoutMS=8000)[MONGO.get("MONGODB_DB_NAME", "toolver_db")]
    ws = gspread.authorize(Credentials.from_service_account_file(
        SA_FILE, scopes=["https://www.googleapis.com/auth/spreadsheets"])).open_by_key(SHEET_ID).worksheet(SHEET_TAB)
    vals = ws.get_all_values()
    col = vals[0].index(NEW_COL_BLOG)              # 0-based
    sheet = {}                                      # slug -> (row number 1-based, blog)
    for i, r in enumerate(vals[1:], start=2):
        if r and r[0]:
            sheet[slugify(r[0])] = (i, r[col].strip() if len(r) > col else "")

    todo = [t for t in db["tools"].find({}) if words(t.get("blog")) < MIN_BLOG_WORDS]
    print(f"{len(todo)} tools need a blog (missing or < {MIN_BLOG_WORDS} words)\n")

    copied, generated, failed, spent = 0, 0, [], 0.0
    for t in todo:
        slug = t.get("slug") or slugify(t["name"])
        row, sblog = sheet.get(slug, (None, ""))
        if words(sblog) >= MIN_BLOG_WORDS:
            print(f"  COPY  {t['name'][:34]:34} sheet blog {words(sblog)}w")
            if args.write:
                db["tools"].update_one({"_id": t["_id"]}, {"$set": blog_fields(sblog, "sheet-backfill")})
            copied += 1
            continue
        if args.no_generate:
            print(f"  SKIP  {t['name'][:34]:34} (sheet blog {words(sblog)}w; generation disabled)")
            continue
        if spent >= args.max_cost:
            print(f"  STOP  {t['name'][:34]:34} (cost cap ${args.max_cost} reached)")
            failed.append(t["name"]); continue
        if not args.write:
            print(f"  GEN   {t['name'][:34]:34} (sheet blog {words(sblog)}w) -> would regenerate")
            generated += 1
            continue
        ts = time.time()
        try:
            blog, cost = write_blog(t["name"], t.get("url", ""), t.get("category", ""), research_blob(t),
                                    f"https://toolverai.com/tool/{slug}")
        except Exception as exc:
            print(f"  FAIL  {t['name'][:34]:34} {type(exc).__name__}: {str(exc)[:80]}")
            failed.append(t["name"]); continue
        spent += cost
        fields = blog_fields(blog, "regenerated")
        if not fields:
            print(f"  THIN  {t['name'][:34]:34} still {words(blog)}w after retries — not saved")
            failed.append(t["name"]); continue
        db["tools"].update_one({"_id": t["_id"]}, {"$set": fields})
        if row:
            try:
                ws.update_cell(row, col + 1, blog)
            except Exception as exc:
                print(f"        (sheet cell update failed: {exc})")
        generated += 1
        print(f"  GEN   {t['name'][:34]:34} {words(blog)}w  ({round(time.time() - ts)}s ${cost:.4f})")

    verb = "Done" if args.write else "Dry-run"
    print(f"\n{verb}: copied {copied} from sheet, generated {generated}, "
          f"not fixed {len(failed)} | DeepSeek ${spent:.4f}")
    for n in failed:
        print("   -", n)


if __name__ == "__main__":
    main()
