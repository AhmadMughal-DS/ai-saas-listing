"""
DeepSeek AI Content & Video Script Generator for ToolverAI
============================================================
Generates:
1. 3-Chunk Video Script for Google Vids (each clip max ~10s)
   - STYLE LOCK: identical character / setting / camera / lighting descriptors
     repeated in every chunk so the 3 independently generated clips look like ONE video
   - Each chunk: "Video Prompt", "Voiceover", "On-Screen Text" (all in quotes) + continuity link
   - Chunk 1 (0-10s) Hook + Problem | Chunk 2 (10-20s) Solution | Chunk 3 (20-30s) Value + CTA
   - Logo slots marked for manual tool-logo placement in Google Vids
2. Complete Social Media Post & Video Description (Instagram / LinkedIn / Facebook / X)
   - Catchy headline, problem/solution, business value, ToolverAI link, deal code, hashtags
"""

import json, time, threading, requests
from pathlib import Path
from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_FILE = CACHE_DIR / "scripts_cache.json"

# Bump this whenever the video script format changes -> scripts regenerate, captions are kept
SCRIPT_VERSION = 2

# Voiceover limits per chunk (~2.3 words/sec natural pace -> fits 8-10s clip)
VO_MIN_WORDS = 14
VO_MAX_WORDS = 24

CACHE_DIR.mkdir(parents=True, exist_ok=True)
cache_lock = threading.Lock()

env_vars = dotenv_values(ENV_PATH)
DEEPSEEK_API_KEY = env_vars.get("DEEPSEEK_API_KEY")
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"


# ----------------------------------------------------------------------------
# Cache helpers
# ----------------------------------------------------------------------------
def load_cache():
    with cache_lock:
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}


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


def tool_cache_id(tool_data):
    return str(tool_data.get("_id") or tool_data.get("name"))


def needs_generation(tool_data, cache):
    entry = cache.get(tool_cache_id(tool_data))
    if not entry:
        return True
    if not entry.get("social_caption"):
        return True
    return entry.get("script_version") != SCRIPT_VERSION or not entry.get("video_script")


# ----------------------------------------------------------------------------
# Tool context
# ----------------------------------------------------------------------------
def _tool_context(tool_data):
    name = tool_data.get("name", "")
    slug = tool_data.get("slug", name.lower().replace(" ", "-"))
    category = tool_data.get("category", "")
    deal_info = tool_data.get("deal")
    deal_str = "None"
    if deal_info and isinstance(deal_info, dict):
        discount = deal_info.get("discount", "")
        code = deal_info.get("code", "")
        if discount or code:
            deal_str = f"{discount} with code '{code}'" if code else discount
    return {
        "name": name,
        "slug": slug,
        "category": category,
        "pricing": tool_data.get("pricingType", "Freemium"),
        "tagline": tool_data.get("tagline", ""),
        "desc": tool_data.get("description", ""),
        "features": ", ".join(tool_data.get("keyFeatures", [])[:4]),
        "toolver_url": f"https://toolverai.com/tool/{slug}",
        "deal_str": deal_str,
    }


def _call_deepseek(system_msg, user_msg, max_tokens, temperature=0.75):
    headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    res = requests.post(DEEPSEEK_URL, headers=headers, json=payload, timeout=60)
    if res.status_code != 200:
        raise RuntimeError(f"DeepSeek HTTP {res.status_code}: {res.text[:200]}")
    return json.loads(res.json()["choices"][0]["message"]["content"])


# ----------------------------------------------------------------------------
# 1) 3-chunk Google Vids script
# ----------------------------------------------------------------------------
CHUNK_PLAN = [
    ("HOOK + PROBLEM", "0-10s"),
    ("THE SOLUTION", "10-20s"),
    ("RESULT + CTA", "20-30s"),
]


def _script_prompt(c):
    return f"""Create a production-grade 30-second vertical (9:16) social video for the AI tool below, split into EXACTLY 3 chunks.
Each chunk is generated SEPARATELY in Google Vids (AI video model, max ~8-10 seconds per clip), then the 3 clips are joined in order.
Because each clip is generated independently, continuity must be engineered into the prompts.

TOOL
- Name: {c['name']}
- Category: {c['category']}
- Pricing: {c['pricing']}
- Tagline: {c['tagline']}
- Description: {c['desc']}
- Key features: {c['features']}

STORY STRUCTURE
- Chunk 1 (0-10s) HOOK + PROBLEM: scroll-stopping first second, then the real, specific pain this tool removes.
- Chunk 2 (10-20s) THE SOLUTION: the same person discovers {c['name']}; show the transformation of the SAME task, now effortless.
- Chunk 3 (20-30s) RESULT + CTA: concrete payoff (time saved / money / output), then call to action to find it on ToolverAI.

CONTINUITY RULES (critical)
1. Write a "style_lock": one paragraph fixing ONE protagonist (age, ethnicity, hair, outfit with colors), ONE location (with props and color palette), lighting, camera/lens, color grade and overall look. Cinematic, photoreal, premium commercial quality.
2. Every "video_prompt" must REPEAT the protagonist + location + lighting + camera descriptors from style_lock word-for-word, so it works when pasted alone.
3. Chunk 1 ends on a specific frame; Chunk 2 must START on that exact frame/pose. Same for Chunk 2 -> Chunk 3. Describe these in "start_frame" and "end_frame".
4. Each video_prompt = ONE continuous shot, 8-10 seconds, one clear action, explicit camera move (e.g. slow push-in, orbit, handheld). 45-80 words.
5. NO readable text, words, letters, logos, or brand names inside the video_prompt visuals (AI video garbles text). Describe screens as "glowing clean dashboard interface, abstract UI shapes". The tool logo is added manually later.
6. Chunk 3 must end with clean negative space (center of frame) for a manually pasted logo end card.

VOICEOVER RULES
- One confident, natural narrator voice across all 3 chunks; the 3 lines must read as ONE continuous sentence flow.
- Each "voiceover" MUST be {VO_MIN_WORDS}-{VO_MAX_WORDS} words (fits in ~8-10 seconds). Count carefully.
- Chunk 1 opens with a hook (question or bold claim). Chunk 2 names "{c['name']}". Chunk 3 ends with: "Find it on ToolverAI dot com."
- Also provide "voice_style": short direction for the narrator (tone, pace, energy) used for all chunks.

ON-SCREEN TEXT RULES
- "on_screen_text": max 6 words per chunk, punchy caption overlay to type in Google Vids. Chunk 3 = "toolverai.com".

Respond ONLY with valid JSON:
{{
  "style_lock": "...",
  "voice_style": "...",
  "chunks": [
    {{"start_frame": "...", "video_prompt": "...", "voiceover": "...", "on_screen_text": "...", "end_frame": "..."}},
    {{"start_frame": "...", "video_prompt": "...", "voiceover": "...", "on_screen_text": "...", "end_frame": "..."}},
    {{"start_frame": "...", "video_prompt": "...", "voiceover": "...", "on_screen_text": "...", "end_frame": "..."}}
  ]
}}"""


def _validate_chunks(data):
    chunks = data.get("chunks")
    if not data.get("style_lock") or not isinstance(chunks, list) or len(chunks) != 3:
        return False, "bad structure"
    for i, ch in enumerate(chunks, 1):
        for key in ("video_prompt", "voiceover", "on_screen_text", "end_frame"):
            if not str(ch.get(key, "")).strip():
                return False, f"chunk {i} missing {key}"
        words = len(str(ch["voiceover"]).split())
        if words > VO_MAX_WORDS + 2:
            return False, f"chunk {i} voiceover too long ({words} words)"
    return True, ""


def _q(text):
    """Wrap in quotes, replacing inner double quotes so copy-paste stays clean."""
    return '"' + str(text).strip().replace('"', "'") + '"'


def format_chunked_script(data, c):
    chunks = data["chunks"]
    out = [
        f"🎥 {c['name'].upper()} · 30s VIDEO = 3 CLIPS × 10s (Google Vids)",
        "Generate each chunk as a separate clip → place in order 1-2-3 → add voiceover + text + logo.",
        "",
        f"🎨 STYLE LOCK (keep identical in all 3 clips):\n{_q(data['style_lock'])}",
        f"🗣️ VOICE STYLE (same narrator for all 3): {_q(data.get('voice_style', 'Confident, warm, energetic, natural pace'))}",
    ]
    logo_notes = [
        "",
        f"🏷️ LOGO: paste {c['name']} logo small in top-right corner the moment it is named (~10s)",
        f"🏷️ LOGO: paste {c['name']} logo large in center negative space for the final 2s end card",
    ]
    for i, (ch, (title, span)) in enumerate(zip(chunks, CHUNK_PLAN), 1):
        out.append("")
        out.append(f"━━━━━━━━ CHUNK {i}/3 · {title} ({span}) ━━━━━━━━")
        if i > 1:
            out.append(f"🔗 STARTS FROM (end of chunk {i-1}): {ch.get('start_frame') or chunks[i-2]['end_frame']}")
        out.append(f"🎬 VIDEO PROMPT: {_q(ch['video_prompt'])}")
        out.append(f"🎙️ VOICEOVER: {_q(ch['voiceover'])}")
        out.append(f"💬 ON-SCREEN TEXT: {_q(ch['on_screen_text'])}")
        out.append(f"⏭️ ENDS ON: {ch['end_frame']}")
        if logo_notes[i - 1]:
            out.append(logo_notes[i - 1])
    out.append("")
    out.append(f"🔗 Link for description / pinned comment: {c['toolver_url']}")
    return "\n".join(out)


def _fallback_chunks(c):
    look = ("a 28-year-old South Asian woman with shoulder-length dark hair in a mustard-yellow sweater, "
            "modern minimalist home office with a walnut desk, a large monitor and a green plant, warm golden-hour "
            "window light, 35mm lens, shallow depth of field, cinematic teal-and-amber color grade, photoreal, 9:16 vertical")
    return {
        "style_lock": look,
        "voice_style": "Confident, warm, energetic, natural conversational pace",
        "chunks": [
            {"start_frame": "",
             "video_prompt": f"{look}. She stares at a cluttered glowing monitor full of abstract windows, rubs her temples and sighs; slow push-in on her frustrated face. No text on screen.",
             "voiceover": f"Still spending hours on {c['category'].lower()} work that should take minutes? You're not slow. Your tools are.",
             "on_screen_text": "Hours wasted. Every week.",
             "end_frame": "Close-up of her tired face lit by the monitor glow."},
            {"start_frame": "Close-up of her tired face lit by the monitor glow.",
             "video_prompt": f"{look}. Starting on a close-up of her tired face, she taps the keyboard, the monitor fills with a clean glowing dashboard of abstract UI shapes; her expression turns to surprise; camera slowly orbits to over-the-shoulder. No text on screen.",
             "voiceover": f"Meet {c['name']}. It handles the heavy lifting with AI, so the same task is done in seconds, not hours.",
             "on_screen_text": "Done in seconds.",
             "end_frame": "Over-the-shoulder shot, she leans back smiling at the screen."},
            {"start_frame": "Over-the-shoulder shot, she leans back smiling at the screen.",
             "video_prompt": f"{look}. She leans back smiling, closes the laptop and picks up her coffee as warm light floods the room; camera pulls back slowly to a wide shot leaving clean empty space in the center of the frame. No text on screen.",
             "voiceover": "Save ten plus hours every week and get your focus back. Find it on ToolverAI dot com.",
             "on_screen_text": "toolverai.com",
             "end_frame": "Wide calm shot with clean negative space in the center for the logo."},
        ],
    }


def generate_video_script(tool_data, max_retries=3):
    c = _tool_context(tool_data)
    system_msg = ("You are an award-winning commercial director and AI-video prompt engineer who writes "
                  "multi-clip scripts for Google Vids / Veo with flawless shot-to-shot continuity.")
    last_err = ""
    for _ in range(max_retries):
        try:
            data = _call_deepseek(system_msg, _script_prompt(c), max_tokens=2000)
            ok, last_err = _validate_chunks(data)
            if ok:
                return format_chunked_script(data, c), data
        except Exception as e:
            last_err = str(e)
        time.sleep(2)
    print(f"    [fallback] {c['name']}: {last_err}")
    data = _fallback_chunks(c)
    return format_chunked_script(data, c), data


# ----------------------------------------------------------------------------
# 2) Social caption
# ----------------------------------------------------------------------------
def generate_social_caption(tool_data, max_retries=3):
    c = _tool_context(tool_data)
    tags = f"#{c['name'].replace(' ', '')} #AITools #{c['category'].replace(' ', '').replace('&', '')} #ToolverAI #Productivity #AIWorkflow #TechTrends"
    prompt = f"""Write a ready-to-publish video description / social post (Instagram, LinkedIn, Facebook, X) for this AI tool.
Tool: {c['name']} | Category: {c['category']} | Pricing: {c['pricing']}
Tagline: {c['tagline']}
Description: {c['desc']}
Key features: {c['features']}

Format strictly:
🚀 [Catchy Scroll-Stopping Headline with Emojis]
🔥 The Problem: (2-3 punchy sentences on the real bottleneck)
✨ The Solution: (How {c['name']} solves it with AI)
💼 Business & Daily Life Impact: (specific time saved, productivity and workflow benefits)
🔗 Direct Access & Reviews: {c['toolver_url']}
🏷️ Exclusive Deal: {c['deal_str']}
📌 {tags}

Respond ONLY with JSON: {{"social_caption": "..."}}"""
    for _ in range(max_retries):
        try:
            data = _call_deepseek("You are an elite social media growth strategist.", prompt, max_tokens=900)
            cap = str(data.get("social_caption", "")).strip()
            if cap:
                return cap
        except Exception:
            pass
        time.sleep(2)
    return (f"🚀 Supercharge your workflow with {c['name']}!\n\n"
            f"🔥 The Problem: Tedious {c['category'].lower()} tasks drain hours and focus.\n\n"
            f"✨ The Solution: {c['name']} automates it with AI.\n\n"
            f"💼 Business & Daily Life Impact: Save 10+ hours weekly.\n\n"
            f"🔗 Direct Access & Reviews: {c['toolver_url']}\n🏷️ Exclusive Deal: {c['deal_str']}\n\n📌 {tags}")


# ----------------------------------------------------------------------------
# Public entry point
# ----------------------------------------------------------------------------
def generate_tool_content(tool_data, max_retries=3):
    if not DEEPSEEK_API_KEY:
        raise ValueError("Missing DEEPSEEK_API_KEY in .env")

    tool_id = tool_cache_id(tool_data)
    entry = load_cache().get(tool_id, {})

    if entry and not needs_generation(tool_data, {tool_id: entry}):
        return entry

    caption = entry.get("social_caption") or generate_social_caption(tool_data, max_retries)

    if entry.get("script_version") == SCRIPT_VERSION and entry.get("video_script"):
        script, chunks = entry["video_script"], entry.get("video_chunks")
    else:
        script, chunks = generate_video_script(tool_data, max_retries)

    result = {
        "video_script": script,
        "video_chunks": chunks,
        "social_caption": caption,
        "script_version": SCRIPT_VERSION,
    }
    update_cache_item(tool_id, result)
    return result
