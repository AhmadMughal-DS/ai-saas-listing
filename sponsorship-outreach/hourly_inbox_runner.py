"""Hourly IMAP Inbox Monitor, Bounce Learner, and Auto-Replier for ToolverAI.

Runs every 1 hour (or on-demand):
  1. Checks PrivateEmail (IMAP) for new messages.
  2. Bounces: Learns from delivery failures, records domain & role, auto-switches to alternate (contact@ or marketing@).
  3. Hot Leads: Auto-replies with 3 sponsorship packages ($49, $99, $199) (plain text, no attachment).
  4. Human Replies: Logs snippet & updates tracking sheet.
  5. Syncs Google Sheet CRM in real time.
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


def wait_for_internet(timeout_seconds: int = 30) -> bool:
    """Quick internet check before polling IMAP."""
    start = time.time()
    while time.time() - start < timeout_seconds:
        for host, port in [("1.1.1.1", 53), ("mail.privateemail.com", 993)]:
            try:
                s = socket.create_connection((host, port), timeout=3)
                s.close()
                return True
            except OSError:
                continue
        time.sleep(2)
    return False


def run_hourly_pass(verbose: bool = True) -> dict:
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if verbose:
        print(f"\n{'='*70}")
        print(f"📥 TOOLVERAI HOURLY INBOX & BOUNCE MONITOR — {now_str} (PKT)")
        print(f"{'='*70}")

    if not wait_for_internet(30):
        print("⚠️ No internet connection. Skipping this pass.")
        return {"error": "no_internet"}

    settings = load_settings()
    app = App(settings, live=True)

    with st.RunLock():
        # 1. Run inbox monitor (auto-handles replies, bounces, hot leads)
        monitor = InboxMonitor(settings, app.store, app.mailer, app.notify)
        stats = monitor.run_once(verbose=verbose)
        if verbose:
            print(f"[✓] Inbox check complete: {stats}")

        # 2. If any bounces were learned and recovered, or replies came in, sync sheet
        if stats.get("bounce", 0) > 0 or stats.get("hot", 0) > 0 or stats.get("replied", 0) > 0 or stats.get("opt_out", 0) > 0:
            if verbose:
                print("📊 Updating Google Sheet CRM with new inbox events...")
            try:
                app.sync_crm()
                if verbose:
                    print("✅ Google Sheet CRM synchronized.")
            except Exception as exc:
                print(f"⚠️ CRM sync warning: {exc}")

    if verbose:
        print(f"{'='*70}\n")
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="ToolverAI Hourly Inbox & Reply Runner")
    parser.add_argument("--loop", action="store_true", help="Run continuously every 1 hour (daemon mode)")
    parser.add_argument("--interval", type=int, default=60, help="Minutes between checks in loop mode (default: 60)")
    args = parser.parse_args()

    if args.loop:
        print(f"[*] Starting hourly inbox loop (every {args.interval} minutes). Ctrl+C to stop.")
        while True:
            try:
                run_hourly_pass(verbose=True)
            except Exception as exc:
                print(f"⚠️ Error during hourly pass: {exc}")
            print(f"⏱ Sleeping {args.interval} minutes until next hourly check...")
            time.sleep(args.interval * 60)
    else:
        run_hourly_pass(verbose=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[!] Stopped by user.")
        sys.exit(0)
