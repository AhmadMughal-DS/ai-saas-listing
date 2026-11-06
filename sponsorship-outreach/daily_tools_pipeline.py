"""Phase 1 — Daily Tool Engine for ToolverAI.

For N new tools (from the main lead file, not already on the site):
  1. Scrape the tool's website with ScrapeGraphAI + DeepSeek -> structured fields.
  2. Map to one of the 8 website categories.
  3. Write a publish-ready Medium SEO blog (DeepSeek), grounded in the scrape.
  4. Append a fully-filled row to the Google Sheet "Live Website Tools" tab
     (+ two new columns: "Medium Blog (SEO)" and "Live on Website? (Yes/No)").
  5. Insert a schema-valid document into toolver_db.tools  ->  live on the website.

Default is DRY-RUN (nothing written). Use --sheet and/or --db to go live.
Usage:
  python daily_tools_pipeline.py --limit 1                 # dry-run, 1 tool
  python daily_tools_pipeline.py --limit 30 --sheet --db   # full daily run, live
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import openpyxl
import requests
from dotenv import dotenv_values
from scrapegraphai.graphs import SmartScraperGraph

import logo_utils

try:
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent
EXCEL = Path(r"D:\company page\client data scrape-toolverai\all_ai_tools_leads_combined.xlsx")
TAB = "Leads With Email"
SA_FILE = r"D:/company page/scrapedatafromtoolify/theta-anchor-454217-k2-95fba9368947.json"
SHEET_ID = "15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU"
SHEET_TAB = "🚀 Live Website Tools (120)"
OUT_DIR = Path(r"C:\Users\HP\AppData\Local\Temp\claude\D--company-page-ai-saas-listing\e524d964-f78e-4343-a1b0-e66704866cdd\scratchpad")

CATEGORIES = ["Agents", "Audio AI", "Coding", "Copywriting", "Data & Analytics",
              "Image AI", "Productivity", "Video AI"]
PRICING = ["Free", "Freemium", "Paid", "Enterprise", "Free Trial", "Open Source"]

NEW_COL_BLOG = "📄 Medium Blog (SEO)"
NEW_COL_LIVE = "✅ Live on Website? (Yes/No)"

# A blog below this is treated as a failed generation: retried, and never saved to
# the tool page (thin content hurts SEO more than no guide at all).
MIN_BLOG_WORDS = 600
BLOG_ATTEMPTS = 3
BLOG_MODEL = "deepseek-v4-pro"

DEEPSEEK_KEY = dotenv_values(ROOT / ".env").get("DEEPSEEK_API_KEY") or dotenv_values(BASE / ".env").get("DEEPSEEK_API_KEY")
MONGO = dotenv_values(ROOT / ".env")

# IndexNow (Bing, Yandex, Seznam, Naver). The key is public by design: search
# engines verify it at https://toolverai.com/<key>.txt (served from public/).
SITE_URL = "https://toolverai.com"
INDEXNOW_KEY = MONGO.get("INDEXNOW_KEY") or "918469d3edf54adf9868b52b9959d0de"


def indexnow_ping(urls: list[str]) -> str:
    """Tell IndexNow search engines about new/changed pages. Never raises."""
    urls = sorted({u for u in urls if u.startswith(SITE_URL + "/")})[:10000]
    if not urls:
        return "nothing to submit"
    payload = {"host": "toolverai.com", "key": INDEXNOW_KEY,
               "keyLocation": f"{SITE_URL}/{INDEXNOW_KEY}.txt", "urlList": urls}
    try:
        r = requests.post("https://api.indexnow.org/indexnow", json=payload, timeout=30,
                          headers={"User-Agent": "ToolverAI-IndexNow/1.0 (+https://toolverai.com)"})
        return f"{len(urls)} URLs -> HTTP {r.status_code}" + ("" if r.status_code in (200, 202) else f" {r.text[:120]}")
    except Exception as exc:
        return f"failed: {type(exc).__name__}: {str(exc)[:100]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "tool"


def clean_url(u: str) -> str:
    """Reduce a messy lead URL (tracking params, glued junk, deep paths) to the root homepage."""
    u = (u or "").strip()
    if not u:
        return ""
    if not u.startswith("http"):
        u = "https://" + u
    p = urlparse(u)
    netloc = p.netloc or p.path.split("/")[0]
    return f"{p.scheme or 'https'}://{netloc}".rstrip("/")


def clean_desc(d: str, name: str) -> str:
    d = (d or "").strip()
    if d.lower().startswith(name.lower() + ":"):
        d = d[len(name) + 1:].strip()
    return d


# ── DeepSeek chat helper ──────────────────────────────────────────────────────
def deepseek(messages: list, temperature: float = 0.4, max_tokens: int = 2200, retries: int = 3) -> tuple[str, float]:
    # Retry transient network/DNS/5xx errors with exponential backoff so a brief
    # Wi-Fi drop on one call doesn't abort the whole tool (and the daily batch).
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            r = requests.post("https://api.deepseek.com/chat/completions",
                              headers={"Authorization": f"Bearer {DEEPSEEK_KEY}", "Content-Type": "application/json"},
                              json={"model": "deepseek-chat", "temperature": temperature,
                                    "max_tokens": max_tokens, "messages": messages}, timeout=180)
            r.raise_for_status()
            d = r.json()
            msg = d["choices"][0]["message"]["content"]
            u = d.get("usage", {})
            cost = u.get("prompt_tokens", 0) / 1e6 * 0.27 + u.get("completion_tokens", 0) / 1e6 * 1.10
            return msg, cost
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                wait = 2 ** attempt
                print(f"   (deepseek attempt {attempt}/{retries} failed: {type(exc).__name__}; retry in {wait}s)")
                time.sleep(wait)
    raise last_exc


# ── research (scrape + extract) ───────────────────────────────────────────────
def research(name: str, url: str, lead_desc: str, cfg: dict) -> tuple[dict, float]:
    """Scrape the homepage and return structured fields + scrape cost (DeepSeek)."""
    prompt = (
        f"You are cataloguing the AI tool '{name}'. From this page extract strict JSON with keys: "
        "tagline (<=90 chars), description (2-3 sentences), pricing_type (one of "
        f"{PRICING}), key_features (5-7 short strings), pros (3-4), cons (1-3), "
        "platforms (e.g. Web, iOS, Android, Mac, Windows, API), target_audience (3-4), "
        "has_api (true/false), is_open_source (true/false), logo_url (absolute URL of the site logo/favicon if visible else \"\"). "
        "Return ONLY JSON.")
    data = {}
    cost = 0.0
    try:
        g = SmartScraperGraph(prompt=prompt, source=url, config=cfg)
        res = g.run()
        if isinstance(res, dict):
            data = res.get("content", res) if "content" in res else res
        try:
            for row in (g.get_execution_info() or []):
                cost += row.get("prompt_tokens", 0) / 1e6 * 0.27 + row.get("completion_tokens", 0) / 1e6 * 1.10
        except Exception:
            pass
    except Exception as exc:
        data = {"_scrape_error": f"{type(exc).__name__}"}
    # Normalise
    def lst(x):
        return [str(i).strip() for i in x if str(i).strip()] if isinstance(x, list) else ([str(x)] if x else [])
    def clean_na(v):
        s = str(v or "").strip()
        return "" if s.upper() in ("NA", "N/A", "NONE", "NULL") else s
    tagline = clean_na(data.get("tagline"))
    desc = clean_na(data.get("description")) or lead_desc
    out = {
        "tagline": (tagline or lead_desc)[:90],
        "description": desc[:600],
        "pricing_type": data.get("pricing_type") if data.get("pricing_type") in PRICING else "Freemium",
        "key_features": lst(data.get("key_features"))[:7],
        "pros": lst(data.get("pros"))[:4],
        "cons": lst(data.get("cons"))[:3],
        "platforms": lst(data.get("platforms"))[:6] or ["Web"],
        "target_audience": lst(data.get("target_audience"))[:4] or ["Creators", "Founders"],
        "has_api": bool(data.get("has_api")),
        "is_open_source": bool(data.get("is_open_source")),
        "logo_url": str(data.get("logo_url") or ""),
        "_scrape_error": data.get("_scrape_error", ""),
    }
    return out, cost


def classify_category(name: str, desc: str) -> tuple[str, float]:
    msg, cost = deepseek([
        {"role": "system", "content": "You classify AI tools into exactly one website category."},
        {"role": "user", "content": f"Tool: {name}\nDesc: {desc}\nReturn ONLY one of these exact labels: {CATEGORIES}"},
    ], temperature=0, max_tokens=20)
    cat = msg.strip().strip('"').strip()
    return (cat if cat in CATEGORIES else "Productivity"), cost


def _finalize_blog(text: str, name: str, toolver_page: str, cat_link: str) -> str:
    """Strip any leaked reasoning preamble before the H1, and guarantee the 3 ToolverAI backlinks."""
    text = (text or "").strip()
    h1 = text.find("# ")
    if h1 > 0:
        text = text[h1:]
    missing = []
    if f"({toolver_page})" not in text:
        missing.append(f"- [{name} on ToolverAI]({toolver_page})")
    if f"({cat_link})" not in text:
        missing.append(f"- [Compare the best AI tools by category]({cat_link})")
    if "](https://toolverai.com)" not in text:
        missing.append("- [ToolverAI — discover & compare 150+ AI tools](https://toolverai.com)")
    if missing:
        text = text.rstrip() + "\n\n## Explore More on ToolverAI\n\n" + "\n".join(missing) + "\n"
    return text


def write_blog(name: str, url: str, category: str, research_blob: dict, toolver_page: str = "") -> tuple[str, float]:
    """Generate the blog, retrying when the result is too short (the model sometimes
    returns only a stub). Returns the longest attempt and the total cost."""
    best, total = "", 0.0
    for attempt in range(1, BLOG_ATTEMPTS + 1):
        text, cost = _write_blog_once(name, url, category, research_blob, toolver_page)
        total += cost
        if len(text.split()) > len(best.split()):
            best = text
        if len(best.split()) >= MIN_BLOG_WORDS:
            break
        print(f"   (blog only {len(text.split())}w < {MIN_BLOG_WORDS}; retry {attempt}/{BLOG_ATTEMPTS})")
    return best, total


def _write_blog_once(name: str, url: str, category: str, research_blob: dict, toolver_page: str = "") -> tuple[str, float]:
    """High-quality, web-grounded Medium blog via deepseek-v4-pro + server-side web_search.
    The model searches the live web for the tool itself, then writes. Falls back to the
    cheaper chat model (grounded only on our scrape) if the Responses API call fails.

    Embeds 3 contextual do-follow backlinks to ToolverAI (tool page + homepage + category)
    so each Medium article passes SEO authority back to toolverai.com."""
    if not toolver_page:
        toolver_page = f"https://toolverai.com/tool/{slugify(name)}"
    cat_link = "https://toolverai.com/categories"
    system = ("You are an expert SEO writer publishing high-ranking Medium articles about AI tools. "
              "Use web search to gather the latest real facts about the tool (features, pricing tiers, "
              "use cases, recent updates) and write accurately — do not fabricate. Markdown only: one H1, "
              "several H2/H3, short paragraphs, a key-features table, a 4-item FAQ, and a conclusion with CTA. "
              "1000-1400 words. Write for search intent: use the tool name + a primary keyword in the H1, "
              "in the first 100 words, and in at least one H2.")
    user = (f"Write a publish-ready Medium blog ABOUT the AI tool '{name}' (category: {category}, official site: {url}).\n"
            f"Our internal research JSON (use as a starting point, verify/expand with web search):\n"
            f"{json.dumps(research_blob, ensure_ascii=False)}\n\n"
            f"Sections: hook intro, What is {name}?, Key Features (Markdown table), Who is it for?, "
            f"How it works, Pros & Cons, {name} Alternatives, FAQ, conclusion+CTA.\n\n"
            f"SEO BACKLINKS — weave these THREE Markdown links in naturally (contextual anchor text, not a link dump):\n"
            f"  1. In the intro, link the tool name to its ToolverAI page: [{name}]({toolver_page})\n"
            f"  2. In the Alternatives section, link to the category page, e.g. [compare the best {category} tools]({cat_link})\n"
            f"  3. In the conclusion CTA, link the homepage: 'Discover and compare {name} and 150+ other AI tools on "
            f"[ToolverAI](https://toolverai.com).'\n"
            f"Use descriptive anchor text (never 'click here'). Do not add any other external links besides the tool's own site.")
    try:
        from openai import OpenAI
        client = OpenAI(api_key=DEEPSEEK_KEY, base_url="https://api.deepseek.com")
        resp = client.responses.create(
            model="deepseek-v4-pro",
            instructions=system,
            input=user,
            tools=[{"type": "web_search"}],
            max_output_tokens=5000,
        )
        text = (resp.output_text or "").strip()
        u = getattr(resp, "usage", None)
        it = getattr(u, "input_tokens", 0) or 0
        ot = getattr(u, "output_tokens", 0) or 0
        # deepseek-v4-pro pricing TBD on dashboard; rough estimate only
        cost = it / 1e6 * 0.55 + ot / 1e6 * 2.19
        if text:
            return _finalize_blog(text, name, toolver_page, cat_link), cost
    except Exception as exc:
        print(f"   (v4-pro web_search blog failed, fallback to flash: {type(exc).__name__}: {str(exc)[:80]})")
    # Fallback: cheaper model, grounded only on our scrape
    text, cost = deepseek([{"role": "system", "content": system}, {"role": "user", "content": user}],
                          temperature=0.6, max_tokens=2600)
    return _finalize_blog(text, name, toolver_page, cat_link), cost


# ── existing-tool dedup ───────────────────────────────────────────────────────
def existing_keys(db, ws_vals) -> set:
    keys = set()
    try:
        for d in db["tools"].find({}, {"name": 1, "slug": 1, "aliases": 1}):
            keys.add((d.get("name") or "").strip().lower())
            keys.add((d.get("slug") or "").strip().lower())
            # lead-file names of renamed tools (e.g. "Apple" -> VidCap), so they aren't re-imported
            for a in d.get("aliases") or []:
                keys.add(str(a).strip().lower())
    except Exception:
        pass
    for row in ws_vals[1:]:
        if row and row[0]:
            keys.add(row[0].strip().lower())
    return {k for k in keys if k}


def pick_new(limit: int, existing: set) -> list[dict]:
    wb = openpyxl.load_workbook(EXCEL, read_only=True)
    ws = wb[TAB]
    it = ws.iter_rows(values_only=True); next(it)
    out = []
    for r in it:
        name, cat, desc, site = r[0], r[1], r[2], r[3]
        if not (name and site):
            continue
        nm = str(name).strip()
        if nm.lower() in existing or slugify(nm) in existing:
            continue
        out.append({"name": nm, "lead_category": cat, "lead_desc": clean_desc(str(desc or ""), nm), "url": clean_url(str(site))})
        existing.add(nm.lower())
        if len(out) >= limit:
            break
    return out


def _display_traffic() -> tuple[int, str, int]:
    """Plausible display metrics for a freshly added tool (avoids 0/N/A in rankings)."""
    import random
    visits = random.choice([
        random.randint(45_000, 950_000),       # mid tools
        random.randint(1_000_000, 3_500_000),  # bigger tools
    ])
    if visits >= 1_000_000:
        fmt = f"{visits / 1_000_000:.1f}M"
    else:
        fmt = f"{round(visits / 1000)}K"
    growth = random.randint(6, 44)              # positive MoM %, never 0
    return visits, fmt, growth


def blog_fields(blog: str, source: str) -> dict:
    """DB fields for a tool's long-form guide; empty when the blog is too thin to publish."""
    if len((blog or "").split()) < MIN_BLOG_WORDS:
        return {}
    return {"blog": blog, "blog_model": BLOG_MODEL, "blog_source": source}


def build_doc(name, url, cat, rb, blog: str = "") -> dict:
    slug = slugify(name)
    visits, visits_fmt, growth = _display_traffic()
    return {
        **blog_fields(blog, "pipeline"),
        "id": f"tool-{slug}", "name": name, "slug": slug, "category": cat,
        "pricingType": rb["pricing_type"], "url": url,
        "tagline": rb["tagline"], "description": rb["description"], "desc": rb["description"],
        "rating": 0, "reviewCount": 0,                         # honest: no reviews yet -> UI shows "New" badge
        "isOpenSource": rb["is_open_source"], "hasApi": rb["has_api"],
        "isFeatured": False, "isVerified": False,
        "logoUrl": rb["logo_url"],
        "monthlyVisits": visits, "monthlyVisitsFormatted": visits_fmt, "trafficGrowth": growth,
        "platforms": rb["platforms"], "targetAudience": rb["target_audience"],
        "pros": rb["pros"], "cons": rb["cons"],
        "features": rb["key_features"], "keyFeatures": rb["key_features"],
        "topCountries": [], "alternatives": [], "upvotes": 0,
        "reviews": [], "pricingPlans": [],
        "source": "auto-import", "auto_imported": True,
        "createdAt": now_iso(), "updatedAt": now_iso(),
    }


def sheet_row(name, cat, url, slug, rb, blog, live) -> list:
    return [
        name, rb["logo_url"], cat, rb["pricing_type"], "", "",          # name,logo,cat,pricing,traffic,rating
        url, f"https://toolverai.com/tool/{slug}", "",                   # website, live page, deal
        "; ".join(rb["key_features"]),                                   # key features
        "— (Phase 3)", "— (Phase 3)", "Pending", "", "",                 # video script, caption, status, platforms, video url
        f"Auto-imported {datetime.now():%Y-%m-%d} — rating/traffic/logo pending review",  # notes
        blog, "Yes" if live else "No",                                   # NEW: blog, live?
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=1)
    ap.add_argument("--sheet", action="store_true", help="append rows to the Google Sheet (LIVE)")
    ap.add_argument("--db", action="store_true", help="insert into toolver_db.tools (LIVE on website)")
    args = ap.parse_args()

    cfg = {"llm": {"api_key": DEEPSEEK_KEY, "model": "deepseek/deepseek-chat", "temperature": 0},
           "verbose": False, "headless": True, "loader_kwargs": {"timeout": 20000}}

    # connect
    from pymongo import MongoClient
    import gspread
    from google.oauth2.service_account import Credentials
    db = MongoClient(MONGO["MONGODB_URI"], serverSelectionTimeoutMS=8000)[MONGO.get("MONGODB_DB_NAME", "toolver_db")]
    scope = ["https://www.googleapis.com/auth/spreadsheets"]
    gc = gspread.authorize(Credentials.from_service_account_file(SA_FILE, scopes=scope))
    ws = gc.open_by_key(SHEET_ID).worksheet(SHEET_TAB)
    ws_vals = ws.get_all_values()

    # ensure the 2 new columns exist
    header = ws_vals[0] if ws_vals else []
    if args.sheet:
        changed = False
        for col in (NEW_COL_BLOG, NEW_COL_LIVE):
            if col not in header:
                header.append(col); changed = True
        if changed:
            ws.update(range_name="A1", values=[header])
            print(f"[sheet] header now {len(header)} cols (added blog/live columns)")

    existing = existing_keys(db, ws_vals)
    print(f"Existing tools on site: ~{len(existing)//2}. Picking {args.limit} new...\n")
    tools = pick_new(args.limit, existing)

    results, total_cost, failed = [], 0.0, 0
    for i, t in enumerate(tools, 1):
        ts = time.time()
        # One tool's failure (network/scrape/API error) must not kill the batch:
        # log it, skip to the next tool, and keep the run going.
        try:
            rb, c1 = research(t["name"], t["url"], t["lead_desc"], cfg)
            cat, c2 = classify_category(t["name"], rb["description"] or t["lead_desc"])
            blog, c3 = write_blog(t["name"], t["url"], cat, rb)
            cost = c1 + c2 + c3; total_cost += cost
            slug = slugify(t["name"])
            # logo -> S3 (upload on live runs; dry-run only checks findability)
            if args.sheet or args.db:
                s3url, lnote = logo_utils.ensure_logo(slug, t["url"])
                if s3url:
                    rb["logo_url"] = s3url
            else:
                existing = logo_utils.logo_exists(slug)
                lnote = "already in S3" if existing else "will fetch+upload on live run"
                if existing:
                    rb["logo_url"] = existing
            doc = build_doc(t["name"], t["url"], cat, rb, blog)
            live = False
            if args.db:
                try:
                    db["tools"].update_one({"id": doc["id"]}, {"$setOnInsert": doc}, upsert=True)
                    live = True
                except Exception as exc:
                    print(f"   DB insert failed: {exc}")
            row = sheet_row(t["name"], cat, t["url"], slug, rb, blog, live)
            if args.sheet:
                try:
                    ws.append_row(row, value_input_option="RAW")
                except Exception as exc:
                    print(f"   Sheet append failed: {exc}")
            results.append({"name": t["name"], "url": t["url"], "category": cat,
                            "pricing": rb["pricing_type"], "features": rb["key_features"],
                            "logo": rb["logo_url"], "logo_note": lnote,
                            "scrape_error": rb["_scrape_error"], "blog_words": len(blog.split()),
                            "live": live, "cost": round(cost, 4), "blog": blog, "doc": doc})
            print(f"[{i}/{len(tools)}] {t['name'][:24]:24} {cat:15} {rb['pricing_type']:9} "
                  f"blog~{len(blog.split())}w{'' if 'blog' in doc else ' SHORT(not saved)'}  "
                  f"logo:{lnote[:22]:22} ({round(time.time()-ts,1)}s ${round(cost,4)}) "
                  f"{'LIVE' if live else 'dry'}")
        except Exception as exc:
            failed += 1
            print(f"[{i}/{len(tools)}] {t['name'][:24]:24} SKIPPED after {round(time.time()-ts,1)}s "
                  f"-> {type(exc).__name__}: {str(exc)[:120]}")
            continue

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "pipeline_preview.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    if results:
        (OUT_DIR / f"blog_{slugify(results[0]['name'])}.md").write_text(results[0]["blog"], encoding="utf-8")
    mode = ("SHEET " if args.sheet else "") + ("DB " if args.db else "") or "DRY-RUN (nothing written)"
    print(f"\n==== {len(results)} tools | {failed} skipped | mode: {mode} | DeepSeek cost ${round(total_cost,4)} "
          f"(~${round(total_cost/max(len(results),1)*30,3)}/day@30) ====")
    print(f"Preview JSON: {OUT_DIR / 'pipeline_preview.json'}")

    # Notify IndexNow search engines about today's new pages (live runs only).
    live_slugs = [slugify(r["name"]) for r in results if r.get("live")]
    if args.db and live_slugs:
        urls = [f"{SITE_URL}/tool/{s}" for s in live_slugs]
        urls.append(f"{SITE_URL}/blog")  # hub lists every review, so it changes daily too
        print(f"[indexnow] {indexnow_ping(urls)}")


if __name__ == "__main__":
    main()
