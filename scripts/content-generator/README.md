# 🎬 ToolverAI Content & Video Script Generator Sub-Module

This sub-module uses **DeepSeek AI** to automatically generate high-converting, viral video creation scripts and complete social media descriptions for every tool in the ToolverAI database, syncing them directly to your Google Sheet.

---

## 📌 Google Sheet Link
🔗 **Direct Spreadsheet URL:** [https://docs.google.com/spreadsheets/d/15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU/edit?gid=0#gid=0](https://docs.google.com/spreadsheets/d/15mlK2uLnbw1J_LxQtisZuI0SxU50F8hHiIqCtDaCzBU/edit?gid=0#gid=0)  
📄 **Tab Name:** `🚀 Live Website Tools (120)`

---

## 🚀 Key Features

### 1. 🎬 Column: `Viral Video Script (Google Flow / Vids)`
Designed specifically to be pasted directly into **Google Flow**, **Google Vids**, **Runway Gen-2/Gen-3**, **InVideo AI**, or read for **Instagram Reels / TikTok / YouTube Shorts**:
* **🎬 [0-3s Viral Hook]:** Visual scene prompt + spoken scroll-stopping hook line.
* **⚠️ [3-15s The Problem]:** Visual prompt of real-world struggle + voiceover explaining the exact bottleneck traditional tools suffer from.
* **💡 [15-35s The Solution & Demo]:** Step-by-step feature showcase and visual prompt demonstrating how the tool resolves the problem.
* **📈 [35-45s Business & Life Value]:** Specific time saved (10-15+ hrs/week), revenue growth, and workflow superpower.
* **👉 [45-55s Call to Action]:** Clear CTA driving traffic directly to ToolverAI (`https://toolverai.com/tool/[slug]`) to view live metrics, reviews, and claim discount codes.

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
