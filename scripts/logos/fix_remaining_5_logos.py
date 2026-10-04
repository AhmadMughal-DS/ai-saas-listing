"""
Fix remaining 5 logos and upload to S3:
1. Aider -> Official SVG from aider.chat rendered via Playwright
2. Lovo.ai -> Official Google S2 180px PNG
3. BabyAGI -> Official creator (Yohei) avatar
4. Lumina AI -> Clean branded app icon (Image AI studio)
5. VidGenix Studio -> Clean branded app icon (Video AI studio)
"""

import io, sys, json, boto3, requests
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright
from dotenv import dotenv_values
from pymongo import MongoClient

sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV = dotenv_values(BASE_DIR / ".env")

REGION = ENV.get("AWS_REGION", "us-east-1")
BUCKET = ENV.get("S3_LOGO_BUCKET", "toolverai-tool-logos")
PREFIX = "logos/"
OUT_SIZE = 256

session = boto3.Session(
    aws_access_key_id=ENV.get("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=ENV.get("AWS_SECRET_ACCESS_KEY"),
    region_name=REGION,
)
s3 = session.client("s3")
db = MongoClient(ENV["MONGODB_URI"])[ENV.get("MONGODB_DB_NAME", "toolver_db")]

def public_url(key):
    return f"https://{BUCKET}.s3.{REGION}.amazonaws.com/{key}"

def normalize_img(img):
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.thumbnail((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    if max(img.size) < OUT_SIZE:
        scale = OUT_SIZE / max(img.size)
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    canvas.paste(img, ((OUT_SIZE - img.width) // 2, (OUT_SIZE - img.height) // 2), img)
    buf = io.BytesIO()
    canvas.save(buf, "PNG", optimize=True)
    return buf.getvalue()

def upload_and_update(tool_name, slug, png_bytes):
    key = f"{PREFIX}{slug}.png"
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=png_bytes,
        ContentType="image/png",
        CacheControl="public, max-age=31536000",
    )
    url = public_url(key)
    res = db.tools.update_one({"slug": slug}, {"$set": {"logoUrl": url}})
    if res.matched_count == 0:
        db.tools.update_one({"name": tool_name}, {"$set": {"logoUrl": url}})
    print(f"✓ [{tool_name}] -> {url}")
    return url

# 1. Aider: Render SVG via Playwright
print("Rendering Aider official logo...")
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 300, "height": 100})
        # Set dark background to capture glowing text or white text
        html = '''
        <html><body style="margin:0; background:transparent; display:flex; align-items:center; justify-content:center;">
        <img src="https://aider.chat/assets/logo.svg" style="width:240px; height:auto;"/>
        </body></html>
        '''
        page.set_content(html)
        shot = page.screenshot(omit_background=True)
        browser.close()
        img = Image.open(io.BytesIO(shot)).convert("RGBA")
        upload_and_update("Aider", "aider", normalize_img(img))
except Exception as e:
    print("Aider error:", e)

# 2. Lovo.ai: Fetch from Google S2
print("Fetching Lovo.ai logo...")
try:
    r = requests.get("https://www.google.com/s2/favicons?domain=lovo.ai&sz=256", headers={"User-Agent": "Mozilla/5.0"})
    img = Image.open(io.BytesIO(r.content)).convert("RGBA")
    upload_and_update("Lovo.ai (Genny)", "lovo-ai", normalize_img(img))
except Exception as e:
    print("Lovo error:", e)

# 3. BabyAGI: Fetch from Yohei GitHub Avatar
print("Fetching BabyAGI logo...")
try:
    r = requests.get("https://avatars.githubusercontent.com/u/1701418?v=4", headers={"User-Agent": "Mozilla/5.0"})
    img = Image.open(io.BytesIO(r.content)).convert("RGBA")
    upload_and_update("BabyAGI", "babyagi", normalize_img(img))
except Exception as e:
    print("BabyAGI error:", e)

# 4. Lumina AI: Clean branded modern icon (Image AI studio - violet/purple crystal gradient)
print("Generating Lumina AI icon...")
try:
    canvas = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    # Draw rounded squircle
    draw.rounded_rectangle([10, 10, 246, 246], radius=54, fill=(124, 58, 237, 255)) # Violet 600
    # Draw inner glowing star/aperture
    draw.polygon([(128, 45), (150, 105), (211, 128), (150, 151), (128, 211), (106, 151), (45, 128), (106, 105)], fill=(255, 255, 255, 255))
    draw.ellipse([110, 110, 146, 146], fill=(167, 139, 250, 255)) # Light violet core
    buf = io.BytesIO()
    canvas.save(buf, "PNG")
    upload_and_update("Lumina AI", "lumina-ai", buf.getvalue())
except Exception as e:
    print("Lumina error:", e)

# 5. VidGenix Studio: Clean branded modern icon (Video AI studio - crimson/orange play gradient)
print("Generating VidGenix Studio icon...")
try:
    canvas = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    # Draw rounded squircle
    draw.rounded_rectangle([10, 10, 246, 246], radius=54, fill=(225, 29, 72, 255)) # Rose 600
    # Draw play triangle & lens flare
    draw.polygon([(100, 75), (185, 128), (100, 181)], fill=(255, 255, 255, 255))
    draw.ellipse([160, 65, 195, 100], fill=(251, 146, 60, 255)) # Orange flare
    buf = io.BytesIO()
    canvas.save(buf, "PNG")
    upload_and_update("VidGenix Studio", "vidgenix", buf.getvalue())
except Exception as e:
    print("VidGenix error:", e)

print("\nDone! Checking total S3 logos in MongoDB:")
s3_count = db.tools.count_documents({"logoUrl": {"$regex": "toolverai-tool-logos"}})
print(f"Total tools with S3 logos: {s3_count} / {db.tools.count_documents({})}")
