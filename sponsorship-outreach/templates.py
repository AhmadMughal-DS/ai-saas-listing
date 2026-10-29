"""Email copy. Plain-text only, 1–2 links, no images/attachments in cold emails —
this is what keeps Email #1 in the primary inbox."""
from __future__ import annotations

from config import AFFILIATE_OFFER, SPONSOR_TIERS, Settings
from sheet import ToolRow, first_sentence


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


def initial_email(tool: ToolRow, s: Settings, video_url: str = "") -> tuple[str, str]:
    subject = f"We featured {tool.name} on ToolverAI (+ a short Problem/Solution video)"
    category = f" in our {tool.category} category" if tool.category else ""

    problem = first_sentence(tool.problem)
    solution = first_sentence(tool.solution)
    if problem and solution:
        preview = f"  The Problem: {problem}\n  The Solution: {solution}\n\n"
    else:
        preview = ""

    if video_url:
        video_line = f"The first cut is already live: {video_url}\n\n"
    else:
        video_line = ""

    body = (
        f"Hi {tool.name} team,\n\n"
        f"Quick heads-up: {tool.name} is now featured on ToolverAI{category}. Here's your live listing:\n"
        f"{tool.live_page}\n\n"
        f"{_features(tool)}"
        f"We've also scripted a 30-second Problem → Solution video about {tool.name}, which we're rolling out "
        f"across our @toolverai channels (YouTube, TikTok, Instagram, LinkedIn and Facebook):\n\n"
        f"{preview}"
        f"{video_line}"
        f"ToolverAI is where people come to compare and pick AI tools, so our visitors arrive with real buying intent. "
        f"Would you like to pin {tool.name} to our Homepage Featured Spot and get full ad-usage rights to the video? "
        f"We have paid partner packages, plus a zero-cost option where we simply feature you through your own "
        f"affiliate link — so there's a fit whatever your budget. "
        f"Reply \"INTERESTED\" and I'll send over our live GA4 traffic stats and both options.\n\n"
        # Keep total links ≤ 2: drop the site URL from the signature when a video link is present
        f"{_signature(s, include_site=not video_url)}\n\n"
        f"{_footer(s)}\n"
    )
    return subject, body


def followup_email(tool: ToolRow, s: Settings, original_subject: str) -> tuple[str, str]:
    subject = original_subject if original_subject.lower().startswith("re:") else f"Re: {original_subject}"
    body = (
        f"Hi {tool.name} team,\n\n"
        f"I'm the founder of ToolverAI — following up personally on my note from a couple of days ago.\n\n"
        f"Here's why I think this is worth two minutes: our visitors come specifically to compare and choose AI "
        f"tools, so the traffic we'd send {tool.name} arrives ready to sign up. Your listing is already live:\n"
        f"{tool.live_page}\n\n"
        f"A Homepage Featured Spot puts {tool.name} in front of that buying-intent audience first, and you get full "
        f"ad-usage rights to the 30-second Problem→Solution video we scripted for you.\n\n"
        f"If that's interesting, just reply \"INTERESTED\" and I'll send our live GA4 traffic numbers and the options "
        f"— including a zero-cost affiliate feature if a paid package isn't the right fit. No pressure either way.\n\n"
        f"{_signature(s, include_site=False)}\n\n"
        f"{_footer(s)}\n"
    )
    return subject, body


def hot_lead_reply(tool_name: str, live_page: str, s: Settings, original_subject: str,
                   has_attachment: bool, greeting_name: str = "") -> tuple[str, str]:
    subject = original_subject if original_subject.lower().startswith("re:") else f"Re: {original_subject}"
    hi = f"Hi {greeting_name}," if greeting_name else f"Hi {tool_name} team,"
    proof = ("I've attached a snapshot of our live GA4 traffic for toolverai.com."
             if has_attachment else
             "I'm happy to share our live GA4 traffic figures for toolverai.com on request.")
    tiers = "\n".join(
        f"  {i}. {t.name} · {t.price}\n     {t.includes}" for i, t in enumerate(SPONSOR_TIERS, 1)
    )
    affiliate_block = (
        f"Not ready for a monthly or one-time package? There's also a zero-cost option:\n\n"
        f"  • {AFFILIATE_OFFER.name} · {AFFILIATE_OFFER.price}\n"
        f"    {AFFILIATE_OFFER.includes}\n\n"
    )
    body = (
        f"{hi}\n\n"
        f"Thanks for getting back to me! {proof}\n\n"
        f"Here are our partner packages for {tool_name}:\n\n"
        f"{tiers}\n\n"
        f"{affiliate_block}"
        f"Every option builds on your existing listing ({live_page}). Tell me which one fits and I'll get "
        f"{tool_name} pinned right away.\n\n"
        f"One quick win either way: many of our partners add their ToolverAI listing link to their own site, "
        f"blog or newsletter — it sends your audience straight to the listing and helps {tool_name} rank higher "
        f"across our comparison pages. Happy to send a ready-made badge if that's useful.\n\n"
        f"{_signature(s)}\n"
    )
    return subject, body
