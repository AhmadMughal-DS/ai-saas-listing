"""Second way to research a tool, for sites where the ScrapeGraph scrape fails.

Fetches the page as plain HTML (browser-like headers); when that carries too little
text — JavaScript-rendered sites — it reads the page through the r.jina.ai reader.
DeepSeek then extracts the listing fields from that text ONLY, and must answer
{"not_found": true} when the page is blocked, generic, or not about the tool.
A page that cannot be read therefore never becomes an invented listing.
"""
from __future__ import annotations

import json
import re

import requests

# Product pages for tools that live on a parent company's site. The Sheet only stores the
# root domain (salesforce.com, openai.com …), which describes the company, not the tool.
PRODUCT_URLS = {
    "agentforce-salesforce": "https://www.salesforce.com/agentforce/",
    "autogpt": "https://agpt.co",
    "freepik-pikaso": "https://www.freepik.com/pikaso",
    "replit-agent": "https://replit.com/products/agent",
    "sora-openai": "https://openai.com/sora/",
    "stable-diffusion-3": "https://stability.ai/stable-image",
    "tableau-pulse": "https://www.tableau.com/products/tableau-pulse",
    "amazon-q-dev": "https://aws.amazon.com/q/developer/",
    "dalle-3": "https://openai.com/index/dall-e-3/",
    "microsoft-autogen": "https://microsoft.github.io/autogen/",
    "ms-copilot-studio": "https://www.microsoft.com/en-us/microsoft-copilot/microsoft-copilot-studio",
    "power-bi-copilot": "https://www.microsoft.com/en-us/power-platform/products/power-bi",
    "whisper-openai": "https://openai.com/index/whisper/",
}

# A bare store homepage says nothing about one app: the app's own URL was lost upstream.
STORE_ROOTS = ("chromewebstore.google.com", "apps.apple.com", "play.google.com")

# Identify honestly as a bot. A site that refuses automated readers stays unread and the tool is
# skipped — add such tools by hand in the admin panel instead of working around the block.
BROWSER_HEADERS = {
    "User-Agent": "ToolverAI-listing-bot/1.0 (+https://toolverai.com)",
    "Accept-Language": "en-US,en;q=0.9",
}
META_KEYS = ("description", "og:description", "og:title", "twitter:description")


def is_store_root(url: str) -> bool:
    return any(root in url for root in STORE_ROOTS)


def page_text(url: str) -> str:
    from bs4 import BeautifulSoup
    text = ""
    try:
        r = requests.get(url, headers=BROWSER_HEADERS, timeout=25)
        if r.ok:
            soup = BeautifulSoup(r.text, "html.parser")
            meta = " ".join(m.get("content", "") for m in soup.find_all("meta")
                            if (m.get("name") or m.get("property") or "").lower() in META_KEYS)
            for tag in soup(["script", "style", "noscript", "svg"]):
                tag.decompose()
            title = soup.title.get_text(" ", strip=True) if soup.title else ""
            text = f"{title}\n{meta}\n{soup.get_text(' ', strip=True)}"
    except Exception:
        pass
    if len(text) < 1500:
        try:
            r = requests.get("https://r.jina.ai/" + url, headers={"User-Agent": BROWSER_HEADERS["User-Agent"]},
                             timeout=60)
            if r.ok and len(r.text) > len(text):
                text = r.text
        except Exception:
            pass
    return re.sub(r"[ \t]+", " ", text)[:14000]


def research(name: str, url: str, pricing_options: list[str], deepseek) -> tuple[dict | None, float, str]:
    """Returns (fields or None, DeepSeek cost, reason). `deepseek` is daily_tools_pipeline.deepseek."""
    text = page_text(url)
    if len(text) < 400:
        return None, 0.0, "page could not be read"
    prompt = (
        f"Below is the text of a web page. You are cataloguing the AI tool '{name}'.\n"
        "Use ONLY facts stated in this text. If the text is an error, blocked or captcha page, or does not "
        f"describe '{name}' specifically, return exactly {{\"not_found\": true}}.\n"
        "Otherwise return strict JSON with keys: tagline (<=90 chars), description (2-3 sentences), "
        f"pricing_type (one of {pricing_options}), key_features (5-7 short strings), pros (3-4), cons (1-3), "
        "platforms (e.g. Web, iOS, Android, Mac, Windows, API), target_audience (3-4), has_api (true/false), "
        "is_open_source (true/false). Return ONLY JSON.\n\n--- PAGE TEXT ---\n" + text)
    msg, cost = deepseek([{"role": "user", "content": prompt}], temperature=0, max_tokens=900)
    m = re.search(r"\{.*\}", msg, re.S)
    try:
        data = json.loads(m.group(0)) if m else {}
    except Exception:
        return None, cost, "model returned unreadable JSON"
    if not isinstance(data, dict) or not data or data.get("not_found"):
        return None, cost, "page does not describe this tool"

    def lst(x):
        return [str(i).strip() for i in x if str(i).strip()] if isinstance(x, list) else []

    rb = {
        "tagline": str(data.get("tagline") or "")[:90],
        "description": str(data.get("description") or "")[:600],
        "pricing_type": data.get("pricing_type") if data.get("pricing_type") in pricing_options else "Freemium",
        "key_features": lst(data.get("key_features"))[:7],
        "pros": lst(data.get("pros"))[:4],
        "cons": lst(data.get("cons"))[:3],
        "platforms": lst(data.get("platforms"))[:6] or ["Web"],
        "target_audience": lst(data.get("target_audience"))[:4] or ["Creators", "Founders"],
        "has_api": bool(data.get("has_api")),
        "is_open_source": bool(data.get("is_open_source")),
        "logo_url": "",
        "_scrape_error": "",
    }
    if not usable(rb):
        return None, cost, "page had too little about the tool"
    return rb, cost, "fallback"


def usable(rb: dict) -> bool:
    return (not rb.get("_scrape_error") and len(rb.get("description", "")) >= 60
            and len(rb.get("key_features", [])) >= 3)
