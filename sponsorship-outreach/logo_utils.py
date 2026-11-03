"""Fetch a tool's real logo and store it in the ToolverAI S3 bucket (matching the
existing `logos/<slug>.png` architecture). Guarantees every tool gets a logo:
site apple-touch-icon / high-res favicon / og:image  ->  icon.horse  ->  Google 256.
"""
from __future__ import annotations

import io
from urllib.parse import urljoin, urlparse

import boto3
import requests
from bs4 import BeautifulSoup
from dotenv import dotenv_values
from PIL import Image

_ENV = dotenv_values(r"D:\company page\ai-saas-listing\.env")
BUCKET = "toolverai-tool-logos"
REGION = _ENV.get("AWS_REGION", "us-east-1")
PUBLIC_BASE = f"https://{BUCKET}.s3.{REGION}.amazonaws.com"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

_s3 = boto3.client("s3", aws_access_key_id=_ENV.get("AWS_ACCESS_KEY_ID"),
                   aws_secret_access_key=_ENV.get("AWS_SECRET_ACCESS_KEY"), region_name=REGION)


def _candidates(domain: str, home: str) -> list[str]:
    cands: list[str] = []
    try:
        r = requests.get(home, timeout=15, headers=UA)
        soup = BeautifulSoup(r.text, "html.parser")
        for link in soup.find_all("link"):
            rel = " ".join(link.get("rel", [])).lower() if isinstance(link.get("rel"), list) else str(link.get("rel") or "").lower()
            if "apple-touch-icon" in rel or rel in ("icon", "shortcut icon", "fluid-icon"):
                if link.get("href"):
                    cands.append(urljoin(home, link["href"]))
        og = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
        if og and og.get("content"):
            cands.append(urljoin(home, og["content"]))
    except Exception:
        pass
    cands.append(f"https://icon.horse/icon/{domain}")
    cands.append(f"https://www.google.com/s2/favicons?domain={domain}&sz=256")
    # de-dup, keep order
    seen, out = set(), []
    for u in cands:
        if u not in seen:
            seen.add(u); out.append(u)
    return out


def _best_image(domain: str, home: str) -> Image.Image | None:
    """Prefer a SQUARE logo (apple-touch-icon/favicon) over wide og:image banners."""
    square_best = None; square_area = 0
    banner_best = None; banner_area = 0
    for u in _candidates(domain, home):
        try:
            resp = requests.get(u, timeout=15, headers=UA)
            if resp.status_code != 200 or len(resp.content) < 400:
                continue
            im = Image.open(io.BytesIO(resp.content))
            im.load()
            w, h = im.size
            if w < 32 or h < 32:
                continue
            aspect = max(w, h) / max(min(w, h), 1)
            area = w * h
            if aspect <= 1.6:                       # square-ish = a real logo/icon
                if area > square_area:
                    square_best, square_area = im, area
                if square_area >= 256 * 256:
                    break
            else:                                   # wide banner (og:image) — last resort only
                if area > banner_area:
                    banner_best, banner_area = im, area
        except Exception:
            continue
    return square_best or banner_best


def _to_png_256(im: Image.Image) -> bytes:
    im = im.convert("RGBA")
    im.thumbnail((256, 256), Image.LANCZOS)
    canvas = Image.new("RGBA", (256, 256), (255, 255, 255, 0))
    canvas.paste(im, ((256 - im.width) // 2, (256 - im.height) // 2), im)
    buf = io.BytesIO()
    canvas.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def logo_exists(slug: str) -> str | None:
    try:
        _s3.head_object(Bucket=BUCKET, Key=f"logos/{slug}.png")
        return f"{PUBLIC_BASE}/logos/{slug}.png"
    except Exception:
        return None


def ensure_logo(slug: str, url: str) -> tuple[str, str]:
    """Return (s3_url, note). Reuses an existing S3 logo if present."""
    existing = logo_exists(slug)
    if existing:
        return existing, "reused"
    domain = urlparse(url).netloc or url
    home = f"https://{domain}" if not url.startswith("http") else url
    im = _best_image(domain, home)
    if im is None:
        return "", "no_logo_found"
    try:
        png = _to_png_256(im)
        _s3.put_object(Bucket=BUCKET, Key=f"logos/{slug}.png", Body=png, ContentType="image/png")
        return f"{PUBLIC_BASE}/logos/{slug}.png", f"uploaded {im.size[0]}x{im.size[1]}"
    except Exception as exc:
        return "", f"upload_err:{type(exc).__name__}"


if __name__ == "__main__":
    import sys
    slug, url = sys.argv[1], sys.argv[2]
    print(ensure_logo(slug, url))
