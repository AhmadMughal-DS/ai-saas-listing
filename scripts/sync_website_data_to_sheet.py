"""
Sync Live MongoDB Database Tools to Google Sheet: 'Present Data in Website'
=============================================================================
Spreadsheet URL: https://docs.google.com/spreadsheets/d/15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU/edit?usp=sharing
Spreadsheet ID:  15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU
"""

import sys, time
from pathlib import Path
from dotenv import dotenv_values
from pymongo import MongoClient
import gspread
from google.oauth2.service_account import Credentials

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
SERVICE_ACCOUNT_FILE = Path("D:/company page/scrapedatafromtoolify/theta-anchor-454217-k2-95fba9368947.json")
SPREADSHEET_ID = "15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU"

SCOPES = [
    'https://spreadsheets.google.com/feeds',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
]

def main():
    print("=" * 65)
    print("🚀 SYNCING LIVE MONGODB TOOLS TO 'PRESENT DATA IN WEBSITE' SHEET")
    print("=" * 65)

    # 1. Read .env for MongoDB URI
    env_vars = dotenv_values(ENV_PATH)
    mongo_uri = env_vars.get("MONGODB_URI")
    if not mongo_uri:
        print("[!] MONGODB_URI not found in .env")
        sys.exit(1)

    db_name = env_vars.get("MONGODB_DB_NAME", "toolver_db")
    print(f"Connecting to MongoDB Atlas ({db_name})...")
    client = MongoClient(mongo_uri)
    db = client[db_name]
    tools_col = db["tools"]

    # 2. Fetch all tools from database
    tools = list(tools_col.find({}).sort([("category", 1), ("globalRank", 1)]))
    print(f"Found {len(tools)} tools in MongoDB.\n")

    if not SERVICE_ACCOUNT_FILE.exists():
        print(f"[!] Google credentials file not found: {SERVICE_ACCOUNT_FILE}")
        sys.exit(1)

    # 3. Authenticate with Google Sheets
    print("Connecting to Google Sheets API...")
    creds = Credentials.from_service_account_file(str(SERVICE_ACCOUNT_FILE), scopes=SCOPES)
    gc = gspread.authorize(creds)
    ss = gc.open_by_key(SPREADSHEET_ID)
    print(f"Connected to Spreadsheet: '{ss.title}' (ID: {ss.id})\n")

    # 4. Prepare Sheet 1: Master All Live Tools
    ws = ss.sheet1
    ws.update_title("🚀 Live Website Tools (120)")

    headers = [
        "Tool Name",
        "Category",
        "Pricing Type",
        "Monthly Traffic",
        "Rating",
        "Official Website",
        "ToolverAI Live Page",
        "Video Hook / One-Liner",
        "Exclusive Deal / Promo Code",
        "Key Features",
        "Video Review Status",
        "Target Social Platform",
        "Review Post URL",
        "Notes"
    ]

    rows = [headers]
    for t in tools:
        name = t.get("name", "")
        slug = t.get("slug", name.lower().replace(" ", "-"))
        cat = t.get("category", "")
        pricing = t.get("pricingType", "")
        visits = t.get("monthlyVisitsFormatted", str(t.get("monthlyVisits", "")))
        rating = str(t.get("rating", "4.8"))
        website = t.get("url", "")
        toolver_url = f"https://toolverai.com/tool/{slug}"
        tagline = t.get("tagline", t.get("description", ""))
        
        deal_info = t.get("deal")
        if deal_info and isinstance(deal_info, dict):
            deal_str = f"{deal_info.get('discount', '')} (Code: {deal_info.get('code', 'N/A')})"
        else:
            deal_str = "None"
            
        features = " | ".join(t.get("keyFeatures", [])[:3])
        status = "⏳ To Script & Record"
        platform = "YouTube / Reels / TikTok"

        rows.append([
            name,
            cat,
            pricing,
            visits,
            rating,
            website,
            toolver_url,
            tagline,
            deal_str,
            features,
            status,
            platform,
            "",
            ""
        ])

    print(f"Uploading {len(rows)} rows to 'Live Website Tools'...")
    ws.clear()
    ws.append_rows(rows, value_input_option='USER_ENTERED')
    time.sleep(1)

    # Header styling
    try:
        ws.format('A1:N1', {
            'backgroundColor': {'red': 0.08, 'green': 0.15, 'blue': 0.35},
            'textFormat': {'bold': True, 'foregroundColor': {'red': 1.0, 'green': 1.0, 'blue': 1.0}},
            'horizontalAlignment': 'CENTER'
        })
    except Exception as e:
        print(f"Formatting note: {e}")

    print(f"\n✅ Successfully synced all {len(tools)} live tools to Google Sheet!")
    print("=" * 65)

if __name__ == "__main__":
    main()
