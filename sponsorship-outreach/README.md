# ToolverAI Automated Sponsorship & Partnership Outreach System

Production-ready automated partnership outreach and inbox monitoring system for **ToolverAI** (`toolverai.com`), built with a single-link strategy for 100% inbox deliverability, multi-sheet lead matching, and zero manual data entry.

---

## 1. Architecture & Multi-Source Data Pipeline

The system coordinates between all existing data assets:

```mermaid
flowchart TD
    Sheet["Google Sheet: Present Data in Website (Tab: 🚀 Live Website Tools 120)"] --> App["outreach.py"]
    YT["YouTube Channel RSS (@toolverai)"] -->|Auto Video Match| App
    
    subgraph MultiSource ["Smart Contact Discovery (Priority Order)"]
        S1["1. outreach-log.json (Verified Cache)"]
        S2["2. Google Sheet: 🎯 Verified Email Leads (2,700+ leads)"]
        S3["3. Master Excel: all_ai_tools_leads_combined.xlsx (3,500+ leads)"]
        S4["4. MongoDB Atlas: sponsorship_leads (15,800+ leads)"]
        S5["5. Live Website Scraper (/about, /contact, /press, footer)"]
        S6["6. SMTP Role Probes (partnerships@, founders@, marketing@, hello@)"]
    end
    
    MultiSource -->|Syntax & MX & RCPT-TO Verified| App
    
    App -->|1. Deliver Email #1 (Plain-text, ≤2 Links)| Prospect["Company Founder / Marketing / Partnership Team"]
    App -->|2. Real-Time Status & Notes Sync| CRM["Google Sheet Tab: 📬 Sponsorship Outreach CRM"]
    
    Prospect -->|Reply: INTERESTED| IMAP["IMAP Monitor (mail.privateemail.com:993)"]
    IMAP -->|Classify: 🔥 Hot Lead| Draft["Drafts Auto-Created + GA4 Traffic Proof + 3 Partner Tiers"]
```

---

## 2. Directory Layout

```
sponsorship-outreach/
├── .env                     # Secrets & app password (gitignored)
├── .env.example             # Clean configuration template
├── .gitignore               # Keeps credentials, logs & assets out of git
├── requirements.txt         # Python dependencies
├── config.py                # Environment & settings loader
├── sheet.py                 # Google Sheets reader & CRM tab manager
├── contacts.py              # Multi-sheet contact resolver + MX/SMTP prober
├── videos.py                # Auto-matching tool titles to YouTube Shorts
├── templates.py             # Single-link email copy (Pitch, Day-3 Follow-up, Hot Lead)
├── mailer.py                # SMTP SSL/TLS sender + IMAP Sent/Drafts appender
├── inbox.py                 # Real-time IMAP listener, bounce suppressor & hot-lead classifier
├── store.py                 # Atomic JSON state tracker with run-lock
├── outreach.py              # Unified Command-Line Interface (CLI)
├── outreach-log.json        # Live JSON database (gitignored)
├── assets/
│   └── ga4-traffic-proof.png # Traffic proof screenshot for hot lead replies (gitignored)
├── previews/                # Generated email drafts for human review (gitignored)
└── drafts/                  # Local .eml backups of hot-lead responses (gitignored)
```

---

## 3. Quickstart & Command Reference

Run all commands using the local Python environment:

```powershell
cd "d:\company page\ai-saas-listing\sponsorship-outreach"
& "C:\Users\HP\AppData\Local\Python\bin\python.exe" outreach.py <command>
```

### 1. Pre-Flight Verification
Verify SMTP login, IMAP mailbox, Google Sheet connectivity, SPF/DMARC records, and port 25 availability:
```powershell
python outreach.py check
```

### 2. Sync Tools from Google Sheet
Pulls all 120 tools from the sheet, skips big-tech exclusion domains (`google.com`, `microsoft.com`, etc.), and auto-matches any uploaded YouTube Shorts:
```powershell
python outreach.py sync
```

### 3. Discover Contacts (Multi-Sheet + MX Probe)
Resolves verified contact emails using the Hunting Sheet, Excel database, Mongo leads, live web scraping, and active SMTP verification without sending any email:
```powershell
# Discover next 10 tools
python outreach.py discover --limit 10

# Discover a specific tool
python outreach.py discover --tool devin

# Retry tools that needed manual review
python outreach.py discover --retry --limit 20
```

### 4. Update the Google Sheets CRM Tab
Pushes all verified emails, rollout hooks, status badges, and live notes to the dedicated **`📬 Sponsorship Outreach CRM`** tab in Google Sheets:
```powershell
python outreach.py crm
```

### 5. Preview Emails (Dry-Run / Zero Risk)
Generates the exact personalized emails into `previews/<tool-slug>.txt` so you can inspect the copy before anything is sent:
```powershell
python outreach.py preview --limit 5
```

### 6. Send a Test Email to Yourself
Sends one real sample email to your personal address to verify formatting and inbox delivery:
```powershell
python outreach.py send --test-to your-email@gmail.com --tool devin
```

### 7. Send Live Outreach Emails (Human-Supervised)
Sends initial pitch emails to verified prospects spaced 3–5 minutes apart, respecting the daily limit (default 35/day):
```powershell
python outreach.py send --live --limit 10
```

### 8. Send Follow-Ups (Day 3)
Sends a short bump thread if no reply after 3 business days:
```powershell
python outreach.py followup --live
```

### 9. Monitor Inbox & Classify Leads
Checks the inbox for bounces, opt-outs, and interested replies:
```powershell
python outreach.py monitor
```

### 10. Autonomous Background Daemon
Runs continuous inbox monitoring and sends queued emails at safe intervals:
```powershell
python outreach.py run --live
```

---

## 4. Deliverability & Safety Guardrails

- **Single-Link Strategy:** Only 1–2 links per email (`ToolverAI Live Page` + `toolverai.com`) to bypass Gmail/Outlook promotional tabs.
- **Zero-Bounce Protection:** Every email undergoes MX record validation and SMTP `RCPT TO` probes before being marked `Ready`. Invalid addresses are rejected immediately.
- **Auto-Suppression:** Hard bounces and unsubscribe replies are automatically added to the suppression list in `outreach-log.json` and will never be contacted again.
- **Namecheap Private Email:** Connects directly to `mail.privateemail.com` over SSL (Port 465 for SMTP, Port 993 for IMAP).
- **CAN-SPAM Compliance:** Clear opt-out instructions and unsubscribe mailto headers on every outgoing message.
- **Sent & Drafts Integration:** Every email sent is saved to the mailbox's `Sent` folder. Hot lead replies are pre-drafted directly into the mailbox's `Drafts` folder with GA4 traffic proof attached.
