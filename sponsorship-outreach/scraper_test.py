"""Minimal ScrapeGraphAI + DeepSeek connectivity test (tiny HTML, ~no cost)."""
import sys
from pathlib import Path
from dotenv import dotenv_values

root_env = Path(r"D:\company page\ai-saas-listing\.env")
sub_env = Path(__file__).with_name(".env")
key = (dotenv_values(sub_env).get("DEEPSEEK_API_KEY")
       or dotenv_values(root_env).get("DEEPSEEK_API_KEY") or "")
if not key:
    print("NO_DEEPSEEK_KEY"); sys.exit(2)
print("DeepSeek key loaded:", key[:6] + "..." + key[-4:])

from scrapegraphai.graphs import SmartScraperGraph

cfg = {
    "llm": {"api_key": key, "model": "deepseek/deepseek-chat", "temperature": 0},
    "verbose": False,
    "headless": True,
}
html = """<html><body>
<h1>Acme AI</h1>
<p>Contact our partnerships team at partners@acme-ai.example or hello@acme-ai.example</p>
<a href='https://twitter.com/acmeai'>Twitter</a>
</body></html>"""

g = SmartScraperGraph(
    prompt="Extract the company name and all contact email addresses as JSON with keys name, emails.",
    source=html,
    config=cfg,
)
out = g.run()
print("RESULT:", out)
