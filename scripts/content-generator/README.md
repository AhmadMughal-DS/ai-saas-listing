# 🎬 ToolverAI Content & Video Script Generator Sub-Module

This sub-module uses **DeepSeek AI** to automatically generate high-converting, viral video creation scripts and complete social media descriptions for every tool in the ToolverAI database, syncing them directly to your Google Sheet.

---

## 📌 Google Sheet Link
🔗 **Direct Spreadsheet URL:** [https://docs.google.com/spreadsheets/d/15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU/edit?gid=0#gid=0](https://docs.google.com/spreadsheets/d/15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU/edit?gid=0#gid=0)  
📄 **Tab Name:** `🚀 Live Website Tools (120)`

---

## 🚀 Key Features

### 1. 🎬 Column: `Video Script · 3 Clips × 10s (Google Vids)`
Google Vids generates max ~8-10s per clip, so every script is **one 30s video split into 3 connected chunks**:
* **🎨 Style Lock:** one fixed protagonist, location, lighting, lens and color grade — repeated word-for-word inside every chunk's video prompt, so 3 separately generated clips look like one video.
* **🗣️ Voice Style:** one narrator direction used for all 3 voiceovers.
* **Chunk 1 (0-10s) Hook + Problem · Chunk 2 (10-20s) Solution · Chunk 3 (20-30s) Result + CTA**, each with:
  * `🎬 VIDEO PROMPT: "..."` — paste into Google Vids (no text/logos inside visuals; AI garbles text)
  * `🎙️ VOICEOVER: "..."` — 14-24 words (fits 8-10s)
  * `💬 ON-SCREEN TEXT: "..."` — max 6 words caption overlay
  * `🔗 STARTS FROM` / `⏭️ ENDS ON` — end frame of chunk N = start frame of chunk N+1
* **🏷️ Logo slots:** small top-right logo at ~10s (when tool is named) + large centered end card in chunk 3's empty negative space — paste manually in Vids.

Bump `SCRIPT_VERSION` in `generator.py` to regenerate all scripts in a new format (captions are kept).

### 2. 📝 Column: `Social Post & Video Caption (IG / LinkedIn / X / FB)`
Ready-to-publish social media captions for Instagram, Facebook, LinkedIn, and X:
* **🚀 Headline:** Scroll-stopping title with emojis.
* **🔥 The Problem:** Punchy breakdown of the pain point.
* **✨ The Solution:** How the tool solves it effortlessly.
* **💼 Business & Daily Life Impact:** Tangible ROI, speed, and time saved for teams and individuals.
* **🔗 Direct Access:** Direct link to the tool's live page on ToolverAI.
* **🏷️ Exclusive Deal / Promo Code:** Verified coupons for higher conversion.
* **📌 Viral Hashtags:** Relevant AI and niche hashtags.

---

## ⚙️ How to Run

### Option 1: Via NPM
```bash
npm run generate:video-scripts
```

### Option 2: Directly via Python
```bash
python scripts/content-generator/sync_to_sheet.py
```

---

## 💾 Smart Local Caching
All generated scripts are permanently saved in:
`scripts/content-generator/cache/scripts_cache.json`

* When you run the script again, existing tools are read instantly from the cache without consuming DeepSeek tokens or time.
* If you ever want to re-generate everything fresh, simply delete or clear `scripts_cache.json` and re-run.
