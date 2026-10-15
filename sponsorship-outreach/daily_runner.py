"""Automated Daily Outreach & Inbox Runner for ToolverAI.

Designed to run daily at 10:00 PM PKT (or catch up if laptop was off):
  1. Wait for Internet: Gracefully waits up to 60s for Wi-Fi/network upon wake-up.
  2. IMAP Inbox Pass: Detect bounces, unsubscribes, replies, and hot leads.
  3. Auto-Discovery: Ensure at least 10 ready tools are queued.
  4. Safe Rate-Limited Sending: Strictly 5-minute spacing between emails (max 15/day).
  5. Post-send Verification: Catch any instant bounces.
  6. Google Sheet CRM Sync: Real-time update of Tab 1 & Tab 2 in tracking sheet.
"""
from __future__ import annotations

import argparse
import datetime
import os
import socket
import sys
import time
from pathlib import Path

# Add directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import Settings, load_settings
from inbox import InboxMonitor
from mailer import Mailer
from outreach import App
import store as st


def wait_for_internet(timeout_seconds: int = 60) -> bool:
    """Wait until internet connectivity is established (vital when laptop wakes up from sleep)."""
    print(f"[*] Checking internet connectivity (waiting up to {timeout_seconds}s for Wi-Fi)...")
    start = time.time()
    while time.time() - start < timeout_seconds:
        for host, port in [("1.1.1.1", 53), ("8.8.8.8", 53), ("mail.privateemail.com", 465)]:
            try:
                s = socket.create_connection((host, port), timeout=3)
                s.close()
                elapsed = int(time.time() - start)
                print(f"[✓] Internet connected ({host}:{port} reached in {elapsed}s).")
                return True
            except OSError:
                continue
        time.sleep(3)
    print("⚠️  Warning: Internet connection check timed out. Proceeding anyway...")
    return False


def run_daily_cycle(live: bool = False, max_send: int = 15) -> None:
    now = datetime.datetime.now()
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")
    hour = now.hour

    print(f"\n{'='*75}")
    print(f"🚀 TOOLVERAI DAILY OUTREACH CYCLE — {now_str} (PKT)")
    print(f"   Mode: {'LIVE (Actual Emails Sending)' if live else 'DRY-RUN (Simulation Only)'}")
    print(f"   Daily Limit: {max_send} emails/day (Strictly 5-minute spacing)")
    if hour == 22:
        print("   Trigger Context: Scheduled 10:00 PM Daily Run")
    elif hour > 22 or hour < 6:
        print(f"   Trigger Context: Night-time / Missed Schedule Catch-up ({now.strftime('%I:%M %p')})")
    else:
        print(f"   Trigger Context: Daytime Run / Resume ({now.strftime('%I:%M %p')})")
    print(f"{'='*75}\n")

    # Ensure internet is connected before attempting IMAP or SMTP
    wait_for_internet(timeout_seconds=60)

    settings = load_settings()
    app = App(settings, live=live)

    # 1. Sync sheet data if store empty
    if not app.store.tools:
        print("[1/5] Syncing initial tools from sheet...")
        app.sync()
    else:
        print(f"[1/5] Database loaded: {len(app.store.tools)} tools tracked.")

    # 2. Monitor Inbox (IMAP)
    print("\n[2/5] 📥 Checking PrivateEmail Inbox (IMAP)...")
    with st.RunLock():
        try:
            inbox_stats = InboxMonitor(settings, app.store, app.mailer, app.notify).run_once(verbose=True)
            print(f"      Inbox check complete: {inbox_stats}")
        except Exception as exc:
            print(f"      ⚠️ Inbox check warning: {exc}")

    # 3. Check Ready Queue & Discover if needed
    ready_count = len([k for k, r in app.store.tools.items() if r["status"] == st.READY])
    print(f"\n[3/5] 🎯 Checking Ready Queue: {ready_count} verified tool(s) ready.")
    if ready_count < max_send:
        needed = max_send - ready_count + 5
        print(f"      Discovering up to {needed} additional contacts...")
        try:
            app.discover(limit=needed)
        except Exception as exc:
            print(f"      ⚠️ Discovery warning: {exc}")

    # 4. Send Batch (Follow-ups + Initial up to daily limit)
    sent_today = app.store.sent_today()
    remaining_quota = max(0, max_send - sent_today)
    print(f"\n[4/5] ✉️  Sending Daily Batch (Sent today: {sent_today}/{max_send}, Remaining quota: {remaining_quota})...")
    if remaining_quota <= 0:
        print("      ✅ Daily send quota already completed for today. No new emails sent.")
    else:
        with st.RunLock():
            try:
                app.send_batch(limit=remaining_quota)
            except Exception as exc:
                print(f"      ⚠️ Send batch error: {exc}")

    # 5. Immediate Post-Send Inbox Check (catch bounces within 15-30s)
    if live and remaining_quota > 0:
        print("\n[5/5] 🔍 Quick Post-Send Inbox Verification...")
        time.sleep(15)
        try:
            InboxMonitor(settings, app.store, app.mailer, app.notify).run_once(verbose=False)
        except Exception:
            pass

    # 6. Final Google Sheet CRM Sync
    print("\n📊 Updating Google Sheets CRM...")
    try:
        app.sync_crm()
        print("      ✅ Google Sheet Tab '🎯 Live Outreach CRM (120 Tools)' updated.")
    except Exception as exc:
        print(f"      ⚠️ CRM sync warning: {exc}")

    print(f"\n{'='*75}")
    print(f"✅ DAILY CYCLE COMPLETE — Sent today: {app.store.sent_today()}/{max_send}")
    print(f"{'='*75}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="ToolverAI Daily 10 PM Outreach Runner")
    parser.add_argument("--live", action="store_true", help="Execute live sending (default is dry-run)")
    parser.add_argument("--limit", type=int, default=15, help="Max emails to send today (default: 15)")
    args = parser.parse_args()

    run_daily_cycle(live=args.live, max_send=args.limit)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[!] Stopped by user.")
        sys.exit(0)
