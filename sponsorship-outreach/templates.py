"""Email copy. Plain-text only, 1–2 links, no images/attachments in cold emails —
this is what keeps Email #1 in the primary inbox.

Rewritten 2026-11-10. The earlier copy sold paid packages on "buying-intent traffic"
to companies who then found a 404 listing and a site with no traffic: ~230 emails,
one human reply. The first email now asks for two small things the site actually
needs — a listing correction and an affiliate/partner link — and makes no claim we
cannot back up. Paid placements are only mentioned when someone asks."""
from __future__ import annotations

from config import AFFILIATE_OFFER, SPONSOR_TIERS, Settings
from sheet import ToolRow


def _footer(s: Settings) -> str:
    lines = [
        "—",
        "Not the right person? A quick pointer to whoever handles partnerships would be much appreciated.",
        "Prefer not to hear from us? Reply \"unsubscribe\" and we won't email you again.",
    ]
    if s.postal_address:
        lines.append(s.postal_address)
    return "\n".join(lines)


def _signature(s: Settings, include_site: bool = True) -> str:
    sig = f"Best,\n{s.sender_name}\nPartnerships · ToolverAI"
    return sig + (f"\n{s.website_url}" if include_site else "")


def _features(tool: ToolRow) -> str:
    feats = tool.features[:3]
    if not feats:
        return ""
    if len(feats) == 1:
        joined = feats[0]
    else:
        joined = ", ".join(feats[:-1]) + " and " + feats[-1]
    return f"On the listing we highlight {joined}.\n\n"


def initial_email(tool: ToolRow, s: Settings, video_url: str = "", correction: bool = False) -> tuple[str, str]:
    """correction=True is the one-time re-pitch to companies whose first email carried a
    listing link that did not work: it says so plainly before the normal pitch."""
    subject = f"{tool.name} is listed on ToolverAI — is the info right?"
    category = f" in our {tool.category} category" if tool.category else ""
    sorry = ("I wrote to you a while ago about your listing, but the link in that email did not work. "
             "Sorry about that — the working one is below.\n\n") if correction else ""
    video_line = f"We also made a short video about {tool.name}: {video_url}\n\n" if video_url else ""

    body = (
        f"Hi {tool.name} team,\n\n"
        f"{sorry}"
        f"I run ToolverAI, a directory where people compare AI tools. We've added {tool.name}{category}:\n"
        f"{tool.live_page}\n\n"
        f"{_features(tool)}"
        f"Two quick questions:\n\n"
        f"1. Is anything on the listing wrong or out of date? Reply with the correction and I'll fix it.\n"
        f"2. Do you have an affiliate or partner program? If so, send me the link and I'll use it on your "
        f"listing, so every visitor we send is tracked to us on your side.\n\n"
        f"{video_line}"
        f"The listing is free and stays free.\n\n"
        # Keep total links ≤ 2: drop the site URL from the signature when a video link is present
        f"{_signature(s, include_site=not video_url)}\n\n"
        f"{_footer(s)}\n"
    )
    return subject, body


def followup_email(tool: ToolRow, s: Settings, original_subject: str) -> tuple[str, str]:
    subject = original_subject if original_subject.lower().startswith("re:") else f"Re: {original_subject}"
    body = (
        f"Hi {tool.name} team,\n\n"
        f"A short follow-up on my note about your ToolverAI listing:\n"
        f"{tool.live_page}\n\n"
        f"If the details there are wrong, a one-line reply is enough and I'll correct them. And if {tool.name} "
        f"has an affiliate or partner program, point me to it and I'll link the listing through it.\n\n"
        f"If this isn't for you, no reply needed — I won't write again.\n\n"
        f"{_signature(s, include_site=False)}\n\n"
        f"{_footer(s)}\n"
    )
    return subject, body


def hot_lead_reply(tool_name: str, live_page: str, s: Settings, original_subject: str,
                   greeting_name: str = "") -> tuple[str, str]:
    """Reply to a positive response. Free affiliate option first, paid placements second.
    Plain text, no attachments."""
    subject = original_subject if original_subject.lower().startswith("re:") else f"Re: {original_subject}"
    hi = f"Hi {greeting_name}," if greeting_name else f"Hi {tool_name} team,"
    tiers = "\n".join(
        f"  {i}. {t.name} · {t.price}\n     {t.includes}" for i, t in enumerate(SPONSOR_TIERS, 1)
    )
    body = (
        f"{hi}\n\n"
        f"Thanks for getting back to me!\n\n"
        f"The simplest way to work together costs nothing:\n\n"
        f"  • {AFFILIATE_OFFER.name} · {AFFILIATE_OFFER.price}\n"
        f"    {AFFILIATE_OFFER.includes}\n\n"
        f"If you'd rather have a fixed placement for {tool_name}, these are the paid options:\n\n"
        f"{tiers}\n\n"
        f"ToolverAI is a young directory, so I'd rather be straight with you: I'm happy to share our current "
        f"visitor numbers before you decide anything, and the affiliate option carries no cost either way.\n\n"
        f"Everything builds on your existing listing ({live_page}). If any detail there needs correcting, "
        f"tell me and I'll update it.\n\n"
        f"{_signature(s)}\n"
    )
    return subject, body
