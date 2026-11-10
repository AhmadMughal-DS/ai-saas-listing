# ToolverAI data architecture — tools, listings and outreach

Written 2026-11-10 after 102 of 113 outreach emails were found to link to a 404 listing.

## The rule

**The website database decides what is live. Everything else only follows it.**
An outreach email is sent only when the tool's page is really served by toolverai.com.

## The four stores

| Store | What it holds | Role |
|---|---|---|
| `toolver_db.tools` (MongoDB Atlas) | One document per tool page | **Source of truth for "live on website"** |
| Google Sheet — "Live Website Tools" tab | One row per tool, with its listing URL | Working list for humans + input for outreach. A *claim*, not proof |
| `outreach-log.json` | Per-tool outreach state: contact, emails sent, replies, status | Source of truth for "who was emailed, what happened" |
| Lead file (`all_ai_tools_leads_combined.xlsx`) | Raw candidate tools | Input only — the daily import picks new tools from here |

## How they stay in sync

```
Lead file ──► daily_tools_pipeline.py ──► toolver_db.tools ──► website / sitemap.xml
                     │  (Sheet row only after the DB insert succeeded)      │
                     ▼                                                      │
               Google Sheet ──► outreach sync ──► outreach-log.json         │
                                                     ▲                      │
                                 listing_sync.py ────┘◄─────────────────────┘
                                 (stamps listing_live = True/False from the live sitemap)
```

1. **Import (09:00, `run_daily_tools.bat`)** — `daily_tools_pipeline.py` decides "already exists" from the
   **database only**. A Sheet row is written only after the DB insert succeeded, and never twice.
2. **Self-heal (same task, right after)** — `restore_missing_tools.py --db --limit 40` finds every tool whose
   listing URL is not on the website and re-imports it under the same slug. Drift is repaired within a day.
3. **Listing sync (every outreach run)** — `listing_sync.apply()` reads the live sitemap and stamps every
   outreach record with `listing_live` and `listing_checked_at`.
4. **Outreach gates (22:00, `run_daily.bat`)** — contact discovery, the send queue and follow-ups only
   include records with `listing_live = True`. Just before each send, the listing URL is requested once
   more; anything other than HTTP 200 stops that email.

If the website cannot be reached, no flag is changed and no email is sent to an unchecked tool.

## Record fields added to `outreach-log.json`

| Field | Meaning |
|---|---|
| `listing_live` | `true` only if the tool's page was in the website sitemap at the last check |
| `listing_checked_at` | When that check ran (UTC) |

The outreach `status` (ready, sent, followed_up …) is never changed by a missing listing — the tool is
simply held back, and resumes by itself once the page is live again.

## Removing a tool on purpose

Deleting a tool from the database alone is not enough: the self-heal would bring it back.
Add its slug (or exact name) on its own line in `do_not_restore.txt`. Neither the daily import nor the
self-heal will re-add it, and outreach will not email it because its listing is not live.

## Reply handling (inbox)

- Helpdesk / bot acknowledgements are logged and never answered.
- The automation sends at most **one** reply per tool, ever. Any further message is left for a person.

## Checking the state by hand

```
python listing_sync.py                 # how many outreach tools are live / missing on the website
python restore_missing_tools.py        # dry-run: which listings would be restored
python restore_missing_tools.py --db   # restore them now
```

Logs: `tools_pipeline.log` (import + self-heal), `daily_outreach.log`, `hourly_inbox.log`,
`restore_missing_tools.log`.
