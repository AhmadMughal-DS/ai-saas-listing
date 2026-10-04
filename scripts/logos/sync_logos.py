"""
ToolverAI Logo Pipeline -> AWS S3 -> MongoDB
=============================================
For every tool in MongoDB `tools`:
  1. Discover logo candidates from the tool's official website
     (<link rel="apple-touch-icon"/"icon"> tags, /apple-touch-icon.png, /favicon.ico)
     plus Google & DuckDuckGo icon services as fallbacks.
  2. Pick the highest-resolution raster image, normalize to a 256x256 transparent PNG.
  3. Upload to S3:  s3://<S3_LOGO_BUCKET>/logos/<slug>.png  (public-read via bucket policy)
  4. Update MongoDB `logoUrl` with the S3 URL.

Also clears placeholder `thumbnailVideoUrl` / `videoDuration` (no real demo videos exist yet)
when run with --clear-placeholder-videos.

Usage:
  python scripts/logos/sync_logos.py                      # only tools without an S3 logo
  python scripts/logos/sync_logos.py --force              # re-fetch every logo
  python scripts/logos/sync_logos.py --clear-placeholder-videos

Env (.env): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_LOGO_BUCKET, MONGODB_URI
"""

import io, sys, json, argparse
from pathlib import Path
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3, requests
from botocore.exceptions import ClientError
from bs4 import BeautifulSoup
from PIL import Image
from dotenv import dotenv_values
from pymongo import MongoClient

sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV = dotenv_values(BASE_DIR / ".env")
REPORT_FILE = Path(__file__).resolve().parent / "logo_report.json"

REGION = ENV.get("AWS_REGION", "us-east-1")
BUCKET = ENV.get("S3_LOGO_BUCKET", "toolverai-tool-logos")
PREFIX = "logos/"
OUT_SIZE = 256
MIN_GOOD = 96          # below this the logo is flagged for manual review
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"}

session = boto3.Session(
    aws_access_key_id=ENV.get("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=ENV.get("AWS_SECRET_ACCESS_KEY"),
    region_name=REGION,
)
s3 = session.client("s3")


def public_url(key):
    return f"https://{BUCKET}.s3.{REGION}.amazonaws.com/{key}"


# ----------------------------------------------------------------------------
# Bucket setup
# ----------------------------------------------------------------------------
def ensure_bucket():
    try:
        s3.head_bucket(Bucket=BUCKET)
        print(f"[✓] Bucket exists: {BUCKET}")
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code not in ("404", "NoSuchBucket"):
            raise
        print(f"[*] Creating bucket {BUCKET} in {REGION}...")
        if REGION == "us-east-1":
            s3.create_bucket(Bucket=BUCKET)
        else:
            s3.create_bucket(Bucket=BUCKET, CreateBucketConfiguration={"LocationConstraint": REGION})
        s3.get_waiter("bucket_exists").wait(Bucket=BUCKET)

    # Allow a bucket *policy* to grant public read (ACLs stay blocked)
    s3.put_public_access_block(
        Bucket=BUCKET,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": False,
            "RestrictPublicBuckets": False,
        },
    )
    policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "PublicReadLogos",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": f"arn:aws:s3:::{BUCKET}/{PREFIX}*",
        }],
    }
    s3.put_bucket_policy(Bucket=BUCKET, Policy=json.dumps(policy))
    print(f"[✓] Public read enabled for s3://{BUCKET}/{PREFIX}*")


# ----------------------------------------------------------------------------
# Logo discovery
# ----------------------------------------------------------------------------
def _get(url, timeout=12):
    try:
        r = requests.get(url, headers=UA, timeout=timeout, allow_redirects=True)
        if r.status_code == 200 and r.content:
            return r
    except requests.RequestException:
        pass
    return None


def _load_image(data):
    """Open raster bytes (PNG/JPG/ICO/WEBP/GIF); for ICO pick the largest frame."""
    try:
        img = Image.open(io.BytesIO(data))
        if img.format == "ICO":
            sizes = sorted(img.info.get("sizes", []), key=lambda s: s[0] * s[1])
            if sizes:
                img.size = sizes[-1]
        img.load()
        return img.convert("RGBA")
    except Exception:
        return None


def candidate_urls(site_url):
    parsed = urlparse(site_url)
    domain = parsed.netloc.lower()
    root = f"{parsed.scheme or 'https'}://{domain}"
    cands = []

    page = _get(site_url)
    if page is not None and "html" in page.headers.get("Content-Type", ""):
        soup = BeautifulSoup(page.text, "html.parser")
        base = page.url
        for link in soup.find_all("link", href=True):
            rel = " ".join(link.get("rel", [])).lower()
            if "icon" in rel and "mask-icon" not in rel:
                href = link["href"].strip()
                if href.lower().split("?")[0].endswith(".svg") or href.startswith("data:"):
                    continue
                cands.append(("site:" + rel, urljoin(base, href)))
        for meta in soup.find_all("meta", attrs={"name": "msapplication-TileImage"}):
            if meta.get("content"):
                cands.append(("site:tile", urljoin(base, meta["content"])))

    cands += [
        ("site:apple-touch-icon.png", f"{root}/apple-touch-icon.png"),
        ("google-s2", f"https://www.google.com/s2/favicons?domain={domain}&sz=256"),
        ("duckduckgo", f"https://icons.duckduckgo.com/ip3/{domain}.ico"),
        ("site:favicon.ico", f"{root}/favicon.ico"),
    ]
    seen, uniq = set(), []
    for src, u in cands:
        if u not in seen:
            seen.add(u)
            uniq.append((src, u))
    return uniq


def find_best_logo(site_url):
    best = None  # (min_side, img, src, url)
    for src, url in candidate_urls(site_url):
        r = _get(url)
        if r is None:
            continue
        img = _load_image(r.content)
        if img is None:
            continue
        w, h = img.size
        if w < 16 or h < 16 or max(w, h) / max(1, min(w, h)) > 2.5:
            continue
        side = min(w, h)
        if best is None or side > best[0]:
            best = (side, img, src, url)
        if side >= OUT_SIZE:
            break
    return best


def normalize(img):
    bbox = img.getbbox()                     # trim fully transparent borders
    if bbox:
        img = img.crop(bbox)
    img.thumbnail((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    if max(img.size) < OUT_SIZE:             # upscale small icons to fill the canvas
        scale = OUT_SIZE / max(img.size)
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    canvas.paste(img, ((OUT_SIZE - img.width) // 2, (OUT_SIZE - img.height) // 2), img)
    buf = io.BytesIO()
    canvas.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def process_tool(tool):
    name, slug, site = tool["name"], tool.get("slug") or tool["name"].lower().replace(" ", "-"), tool.get("url", "")
    best = find_best_logo(site) if site else None
    if best is None:
        return {"name": name, "slug": slug, "ok": False, "reason": "no logo found", "site": site}
    side, img, src, url = best
    key = f"{PREFIX}{slug}.png"
    s3.put_object(
        Bucket=BUCKET, Key=key, Body=normalize(img),
        ContentType="image/png", CacheControl="public, max-age=31536000",
    )
    return {"name": name, "slug": slug, "ok": True, "logoUrl": public_url(key),
            "source": src, "source_url": url, "source_px": side,
            "needs_review": side < MIN_GOOD, "site": site}


# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-fetch logos even if already on S3")
    ap.add_argument("--clear-placeholder-videos", action="store_true",
                    help="remove placeholder thumbnailVideoUrl/videoDuration (no real videos yet)")
    args = ap.parse_args()

    print("=" * 66)
    print("🏷️  TOOLVERAI LOGO PIPELINE  (website -> S3 -> MongoDB)")
    print("=" * 66)
    ensure_bucket()

    db = MongoClient(ENV["MONGODB_URI"])[ENV.get("MONGODB_DB_NAME", "toolver_db")]
    tools = list(db.tools.find({}, {"name": 1, "slug": 1, "url": 1, "logoUrl": 1}))
    s3_base = public_url(PREFIX)
    todo = tools if args.force else [t for t in tools if not str(t.get("logoUrl", "")).startswith(s3_base)]
    print(f"[*] {len(todo)}/{len(tools)} tools need a logo\n")

    results = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(process_tool, t): t for t in todo}
        for i, fut in enumerate(as_completed(futs), 1):
            t = futs[fut]
            try:
                res = fut.result()
            except Exception as e:
                res = {"name": t["name"], "ok": False, "reason": str(e)[:150], "site": t.get("url")}
            results.append(res)
            if res["ok"]:
                db.tools.update_one({"_id": t["_id"]}, {"$set": {"logoUrl": res["logoUrl"]}})
                flag = "  ⚠️ low-res, review" if res["needs_review"] else ""
                print(f"  [{i}/{len(todo)}] ✓ {res['name']:<34} {res['source_px']:>4}px  ({res['source']}){flag}")
            else:
                print(f"  [{i}/{len(todo)}] ✗ {res['name']:<34} {res.get('reason')}")

    if args.clear_placeholder_videos:
        r = db.tools.update_many({}, {"$unset": {"thumbnailVideoUrl": "", "videoDuration": ""}})
        print(f"\n[✓] Cleared placeholder demo-video fields on {r.modified_count} tools")

    REPORT_FILE.write_text(json.dumps(sorted(results, key=lambda r: r["name"]), indent=2, ensure_ascii=False), encoding="utf-8")
    ok = sum(r["ok"] for r in results)
    review = [r["name"] for r in results if r.get("needs_review")]
    failed = [r["name"] for r in results if not r["ok"]]
    print("\n" + "=" * 66)
    print(f"✅ Uploaded {ok}/{len(todo)} logos to s3://{BUCKET}/{PREFIX}")
    if review:
        print(f"⚠️  Low-res (<{MIN_GOOD}px source), review manually: {', '.join(review)}")
    if failed:
        print(f"❌ No logo found: {', '.join(failed)}")
    print(f"📄 Report: {REPORT_FILE}")
    print("=" * 66)


if __name__ == "__main__":
    main()
