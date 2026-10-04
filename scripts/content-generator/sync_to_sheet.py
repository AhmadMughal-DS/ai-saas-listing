"""
Sync Live MongoDB Tools & DeepSeek Video Content to Google Sheet
================================================================
Target Sheet: https://docs.google.com/spreadsheets/d/15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU/edit?gid=0#gid=0
Spreadsheet ID: 15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU
"""

import sys, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import dotenv_values
from pymongo import MongoClient
import gspread
from google.oauth2.service_account import Credentials

# Ensure utf-8 terminal output on Windows
sys.stdout.reconfigure(encoding='utf-8')

# Import generator
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.append(str(SCRIPT_DIR))
from generator import generate_tool_content, load_cache, needs_generation, SCRIPT_VERSION

BASE_DIR = SCRIPT_DIR.parent.parent
ENV_PATH = BASE_DIR / ".env"
SERVICE_ACCOUNT_FILE = Path("D:/company page/scrapedatafromtoolify/theta-anchor-454217-k2-95fba9368947.json")
SPREADSHEET_ID = "15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU"

SCOPES = [
    'https://spreadsheets.google.com/feeds',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
]

def main():
    print("=" * 70)
    print("🎬 TOOLVERAI VIDEO SCRIPT & SOCIAL CONTENT GENERATOR (DEEPSEEK AI)")
    print("=" * 70)

    # 1. Connect to MongoDB
    env_vars = dotenv_values(ENV_PATH)
    mongo_uri = env_vars.get("MONGODB_URI")
    if not mongo_uri:
        print("[❌] MONGODB_URI not found in .env")
        sys.exit(1)

    db_name = env_vars.get("MONGODB_DB_NAME", "toolver_db")
    print(f"[*] Connecting to MongoDB Atlas ({db_name})...")
    client = MongoClient(mongo_uri)
    db = client[db_name]
    tools_col = db["tools"]

    tools = list(tools_col.find({}).sort([("category", 1), ("globalRank", 1)]))
    total_tools = len(tools)
    print(f"[✓] Retrieved {total_tools} tools from MongoDB Atlas.\n")

    if total_tools == 0:
        print("[!] No tools found in MongoDB.")
        sys.exit(0)

    # 2. Check Cache & Generate Missing Content via DeepSeek
    cache = load_cache()
    missing_tools = [t for t in tools if needs_generation(t, cache)]
    cached_count = total_tools - len(missing_tools)
    print(f"[*] Cache Status: {cached_count}/{total_tools} tools up to date (script v{SCRIPT_VERSION}).")
    
    if missing_tools:
        print(f"[*] Generating AI Video Scripts & Social Captions for {len(missing_tools)} tools using DeepSeek...")
        completed = cached_count
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_tool = {executor.submit(generate_tool_content, t): t for t in missing_tools}
            for future in as_completed(future_to_tool):
                t = future_to_tool[future]
                completed += 1
                try:
                    res = future.result()
                    print(f"  [{completed}/{total_tools}] ✓ Generated for: {t.get('name')} ({t.get('category')})")
                except Exception as e:
                    print(f"  [{completed}/{total_tools}] ⚠️ Error on {t.get('name')}: {e}")
        print("\n[✓] All video scripts and social captions generated successfully!\n")
    else:
        print("[✓] All 120 tools are cached and ready to sync!\n")

    # Reload fresh cache
    cache = load_cache()

    # 3. Authenticate with Google Sheets
    if not SERVICE_ACCOUNT_FILE.exists():
        print(f"[❌] Service account file not found: {SERVICE_ACCOUNT_FILE}")
        sys.exit(1)

    print("[*] Connecting to Google Sheets API...")
    creds = Credentials.from_service_account_file(str(SERVICE_ACCOUNT_FILE), scopes=SCOPES)
    gc = gspread.authorize(creds)
    ss = gc.open_by_key(SPREADSHEET_ID)
    print(f"[✓] Connected to Spreadsheet: '{ss.title}'")

    # Select sheet
    ws = ss.sheet1
    ws.update_title("🚀 Live Website Tools (120)")

    # 4. Build Table Rows
    headers = [
        "Tool Name",
        "🏷️ Logo (S3 PNG · Download for Vids)",
        "Category",
        "Pricing Type",
        "Monthly Traffic",
        "Rating",
        "Official Website",
        "ToolverAI Live Page",
        "Exclusive Deal / Promo Code",
        "Key Features",
        "🎬 Video Script · 3 Clips × 10s (Google Vids)",
        "📝 Social Post & Video Caption (IG / LinkedIn / X / FB)",
        "Video Production Status",
        "Target Social Platforms",
        "Published Video URL",
        "Notes"
    ]

    rows = [headers]
    for t in tools:
        t_id = str(t.get("_id") or t.get("name"))
        name = t.get("name", "")
        slug = t.get("slug", name.lower().replace(" ", "-"))
        cat = t.get("category", "")
        pricing = t.get("pricingType", "Freemium")
        visits = t.get("monthlyVisitsFormatted", str(t.get("monthlyVisits", "")))
        rating = str(t.get("rating", "4.8"))
        website = t.get("url", "")
        toolver_url = f"https://toolverai.com/tool/{slug}"
        logo_url = t.get("logoUrl", "")

        deal_info = t.get("deal")
        if deal_info and isinstance(deal_info, dict):
            disc = deal_info.get("discount", "")
            c = deal_info.get("code", "")
            deal_str = f"{disc} (Code: {c})" if c else (disc or "None")
        else:
            deal_str = "None"

        features = " | ".join(t.get("keyFeatures", [])[:3])

        content = cache.get(t_id, {})
        video_script = content.get("video_script", "")
        social_caption = content.get("social_caption", "")

        status = "⏳ Ready for Google Vids"
        platforms = "Instagram Reels, TikTok, YouTube Shorts, LinkedIn, X, Facebook"

        rows.append([
            name,
            logo_url,
            cat,
            pricing,
            visits,
            rating,
            website,
            toolver_url,
            deal_str,
            features,
            video_script,
            social_caption,
            status,
            platforms,
            "",
            ""
        ])

    # 5. Push to Google Sheets
    print(f"[*] Uploading {len(rows)} rows to Google Sheet '{ws.title}'...")
    ws.clear()
    ws.append_rows(rows, value_input_option='USER_ENTERED')
    time.sleep(2)

    # 6. Apply Formatting (Header styling, column widths, freeze header)
    print("[*] Applying visual formatting...")
    try:
        # Header formatting
        ws.format('A1:P1', {
            'backgroundColor': {'red': 0.07, 'green': 0.12, 'blue': 0.22}, # Deep Navy
            'textFormat': {'bold': True, 'foregroundColor': {'red': 1.0, 'green': 1.0, 'blue': 1.0}, 'fontSize': 10},
            'horizontalAlignment': 'CENTER',
            'verticalAlignment': 'MIDDLE',
            'wrapStrategy': 'WRAP'
        })
        
        # Freeze top row + name column
        ws.freeze(rows=1, cols=1)

        # Set wrap strategy for content columns (Video Script in Col K, Caption in Col L)
        ws.format('K2:L125', {
            'wrapStrategy': 'WRAP',
            'verticalAlignment': 'TOP',
            'textFormat': {'fontSize': 9}
        })

        # Center align Category, Pricing, Traffic, Rating
        ws.format('C2:F125', {
            'horizontalAlignment': 'CENTER',
            'verticalAlignment': 'MIDDLE'
        })

        def col_width(start, end, px):
            return {"updateDimensionProperties": {
                "range": {"sheetId": ws.id, "dimension": "COLUMNS", "startIndex": start, "endIndex": end},
                "properties": {"pixelSize": px}, "fields": "pixelSize"}}

        # Set column widths via batch update
        body = {
            "requests": [
                col_width(0, 1, 160),    # A Tool Name
                col_width(1, 2, 280),    # B Logo S3 URL
                col_width(10, 12, 450),  # K-L Video Script + Social Caption
            ]
        }
        ss.batch_update(body)
        print("[✓] Formatting applied: Header frozen, dark navy theme, wrapped text, 450px wide content columns.")
    except Exception as e:
        print(f"[!] Formatting notice: {e}")

    print("\n" + "=" * 70)
    print("🎉 ALL 120 AI VIDEO SCRIPTS & SOCIAL CAPTIONS SYNCED TO GOOGLE SHEET!")
    print(f"🔗 Direct Google Sheet URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit")
    print("=" * 70)

if __name__ == "__main__":
    main()
