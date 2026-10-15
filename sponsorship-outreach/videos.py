"""Auto-match published @toolverai YouTube videos to tools (no manual links).

Priority: sheet column "Published Video URL" → YouTube channel RSS title match.
A missing match never blocks outreach — the live listing page is used instead.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET

import requests

from config import Settings

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ToolverAI-Outreach/1.0", "Accept-Language": "en"}
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


class VideoMatcher:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.videos: list[tuple[str, str]] = []  # (normalized title, url)
        self.status = "not loaded"

    def _channel_id(self) -> str:
        if self.settings.youtube_channel_id:
            return self.settings.youtube_channel_id
        html = requests.get(self.settings.youtube_url, headers=UA, timeout=15).text
        m = re.search(r'"(?:channelId|externalId)":"(UC[\w-]{22})"', html)
        return m.group(1) if m else ""

    def load(self) -> None:
        try:
            cid = self._channel_id()
            if not cid:
                self.status = "channel id not found"
                return
            r = requests.get(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}", headers=UA, timeout=15)
            if r.status_code != 200:
                self.status = f"feed unavailable (HTTP {r.status_code}) — no public uploads yet?"
                return
            root = ET.fromstring(r.content)
            for entry in root.findall("a:entry", NS):
                title = entry.findtext("a:title", default="", namespaces=NS)
                vid = entry.findtext("yt:videoId", default="", namespaces=NS)
                if title and vid:
                    self.videos.append((_norm(title), f"https://www.youtube.com/shorts/{vid}"))
            self.status = f"{len(self.videos)} videos loaded"
        except Exception as exc:  # network issues must never stop outreach
            self.status = f"feed error: {exc}"

    def match(self, tool_name: str, sheet_video_url: str = "") -> str:
        if sheet_video_url.startswith("http"):
            return sheet_video_url
        name = _norm(tool_name)
        # Also try the name without version suffixes ("Claude 3.7" → "claude")
        short = _norm(re.sub(r"\b(ai|v?\d+(\.\d+)*)\b", " ", tool_name, flags=re.I))
        for title, url in self.videos:
            padded = f" {title} "
            if f" {name} " in padded or (len(short) >= 4 and f" {short} " in padded):
                return url
        return ""
