"""
DeepSeek AI Content & Video Script Generator for ToolverAI
============================================================
Generates:
1. Viral 45-60s Video Generation Script (Google Flow / Vids / Reels / TikTok / Shorts)
   - Visual Cues & Spoken Voiceover
   - Hook (0-3s), Problem (3-15s), Solution & Demo (15-35s), Business Value (35-45s), CTA (45-55s)
2. Complete Social Media Post & Video Description (Instagram / LinkedIn / Facebook / X)
   - Catchy headline, problem/solution, business value, ToolverAI link, deal code, hashtags
"""

import os, json, time, threading, requests
from pathlib import Path
from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_FILE = CACHE_DIR / "scripts_cache.json"

CACHE_DIR.mkdir(parents=True, exist_ok=True)
cache_lock = threading.Lock()

env_vars = dotenv_values(ENV_PATH)
DEEPSEEK_API_KEY = env_vars.get("DEEPSEEK_API_KEY")

def load_cache():
    with cache_lock:
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

def save_cache(cache):
    with cache_lock:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)

def update_cache_item(tool_id, data):
    with cache_lock:
        current = {}
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    current = json.load(f)
            except Exception:
                current = {}
        current[tool_id] = data
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2, ensure_ascii=False)

def generate_tool_content(tool_data, max_retries=3):
    tool_id = str(tool_data.get("_id") or tool_data.get("name"))
    
    # Check cache first
    cached = load_cache()
    if tool_id in cached and cached[tool_id].get("video_script"):
        return cached[tool_id]

    if not DEEPSEEK_API_KEY:
        raise ValueError("Missing DEEPSEEK_API_KEY in .env")

    name = tool_data.get("name", "")
    slug = tool_data.get("slug", name.lower().replace(" ", "-"))
    category = tool_data.get("category", "")
    pricing = tool_data.get("pricingType", "Freemium")
    tagline = tool_data.get("tagline", "")
    desc = tool_data.get("description", "")
    features = ", ".join(tool_data.get("keyFeatures", [])[:4])
    toolver_url = f"https://toolverai.com/tool/{slug}"

    deal_info = tool_data.get("deal")
    deal_str = "None"
    if deal_info and isinstance(deal_info, dict):
        discount = deal_info.get("discount", "")
        code = deal_info.get("code", "")
        if discount or code:
            deal_str = f"{discount} with code '{code}'" if code else discount

    prompt = f"""You are a viral AI video director, social media producer, and growth strategist for ToolverAI (https://toolverai.com).

Generate high-converting content for this AI tool:
Tool Name: {name}
Category: {category}
Pricing: {pricing}
Tagline: {tagline}
Description: {desc}
Key Features: {features}
ToolverAI Live Page: {toolver_url}
Exclusive Deal / Discount: {deal_str}

Please generate two detailed, ready-to-use outputs:

1. VIDEO SCRIPT (Optimized for Google Flow / Google Vids / Runway / InVideo / Reels / TikTok / YouTube Shorts / X):
Format strictly like this with visual prompts in brackets and exact voiceover lines:
🎬 [0-3s VIRAL HOOK]: (Visual action that stops scrolling) + Voiceover line.
⚠️ [3-15s THE PROBLEM]: (Visual: real-world pain point or bottleneck) + Voiceover explaining exactly why traditional manual methods waste time or cause frustration.
💡 [15-35s THE SOLUTION & DEMO]: (Visual walkthrough of {name} UI & key features) + Voiceover showcasing how {name} solves this pain point instantly.
📈 [35-45s BUSINESS & LIFE VALUE]: (Visual: results, speed, ROI) + Voiceover explaining concrete hours saved (e.g. 10-20 hrs/week) or business revenue impact.
👉 [45-55s CALL TO ACTION]: (Visual: pointing to screen or ToolverAI UI) + Voiceover driving viewers to check user reviews and grab deals at ToolverAI: {toolver_url}

2. SOCIAL MEDIA POST & VIDEO CAPTION (Optimized for Instagram, LinkedIn, Facebook, and X / Twitter):
Format strictly like this:
🚀 [Catchy Scroll-Stopping Headline with Emojis]
🔥 The Problem: (2-3 punchy sentences on the real bottleneck professionals face)
✨ The Solution: (How {name} solves this seamlessly with AI)
💼 Business & Daily Life Impact: (Specific time saved, productivity unlocked, and workflow benefits)
🔗 Direct Access & Reviews: {toolver_url}
🏷️ Exclusive Deal: {deal_str}
📌 Viral Hashtags: #{name.replace(' ', '')} #AITools #{category.replace(' ', '')} #ToolverAI #Productivity #AIWorkflow #TechTrends

Respond ONLY with a valid JSON object matching this schema:
{{
  "video_script": "Full multi-line video script...",
  "social_caption": "Full multi-line social media post caption..."
}}
"""

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "You are an elite viral AI video scriptwriter and social media growth strategist."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 1500,
        "temperature": 0.7
    }

    for attempt in range(max_retries):
        try:
            res = requests.post("https://api.deepseek.com/chat/completions", headers=headers, json=payload, timeout=40)
            if res.status_code == 200:
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                
                result = {
                    "video_script": parsed.get("video_script", "").strip(),
                    "social_caption": parsed.get("social_caption", "").strip()
                }

                if result["video_script"] and result["social_caption"]:
                    update_cache_item(tool_id, result)
                    return result
            else:
                time.sleep(2)
        except Exception as e:
            time.sleep(2)

    # Fallback template if network/API fails
    fallback = {
        "video_script": f"🎬 [0-3s HOOK]: (Visual: Frustrated creator working late) Still doing {category.lower()} manually? Stop right now.\n⚠️ [3-15s PROBLEM]: (Visual: Clock spinning fast) Wasting hours on repetitive {category.lower()} bottlenecks drains your creative energy and profits.\n💡 [15-35s SOLUTION]: (Visual: {name} dashboard in action) {name} automates your entire workflow in seconds with cutting-edge AI.\n📈 [35-45s BUSINESS VALUE]: (Visual: Clean workflow & high output) Save 10+ hours every week and scale your productivity 3x.\n👉 [45-55s CALL TO ACTION]: (Visual: ToolverAI logo) Discover {name}, read verified ratings, and get discounts at ToolverAI: {toolver_url}",
        "social_caption": f"🚀 Supercharge your workflow with {name}!\n\n🔥 The Problem: Spending countless hours on tedious {category.lower()} tasks slows down your momentum and kills focus.\n\n✨ The Solution: {name} tackles this head-on with powerful AI automation.\n\n💼 Business & Daily Life Impact: Save 10+ hours weekly and unlock unprecedented workflow speed.\n\n🔗 Full details & user reviews: {toolver_url}\n🏷️ Exclusive Deal: {deal_str}\n\n📌 Hashtags: #{name.replace(' ', '')} #AITools #ToolverAI #{category.replace(' ', '')} #Productivity"
    }
    update_cache_item(tool_id, fallback)
    return fallback
