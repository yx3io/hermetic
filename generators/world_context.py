#!/usr/bin/env python3
"""
Gather live external context for Hermes.

Sources (all free, no API key):
  - Hacker News top stories (filtered for AI/tech relevance)
  - ArXiv recent AI/ML/CL papers
"""

import random
import re
import xml.etree.ElementTree as ET

import requests

HN_TOP = "https://hacker-news.firebaseio.com/v0/topstories.json"
HN_ITEM = "https://hacker-news.firebaseio.com/v0/item/{}.json"

ARXIV_QUERY = (
    "http://export.arxiv.org/api/query?"
    "search_query=cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG"
    "&sortBy=submittedDate&sortOrder=descending&max_results=20"
)

AI_KEYWORDS = re.compile(
    r"(?i)\b(ai|gpt|llm|model|neural|transformer|openai|anthropic|gemini|"
    r"machine.?learning|deep.?learning|language.?model|agi|alignment|"
    r"diffusion|llama|mistral|hermes|nous|fine.?tun|rlhf|agent|autonomous|"
    r"consciousness|sentien|robot|compute|gpu|training|inference|open.?source|"
    r"benchmark|reasoning|multimodal|embedding|token|context.?window|"
    r"artificial.?intelligen|safety|interpretab|scaling|synthetic|"
    r"reinforcement|generative|chatbot|copilot|claude|phi|qwen)\b"
)


def fetch_hn_stories(n=40):
    """Top HN stories -> list of {title, url, score}."""
    try:
        ids = requests.get(HN_TOP, timeout=10).json()[:n]
    except Exception:
        return []

    stories = []
    for story_id in ids:
        try:
            item = requests.get(HN_ITEM.format(story_id), timeout=5).json()
            if item and item.get("title"):
                stories.append({
                    "title": item["title"],
                    "url": item.get("url", ""),
                    "score": item.get("score", 0),
                })
        except Exception:
            continue
    return stories


def fetch_arxiv_papers():
    """Recent AI/ML/CL papers -> list of {title, summary}."""
    try:
        resp = requests.get(ARXIV_QUERY, timeout=15)
        resp.raise_for_status()
    except Exception:
        return []

    papers = []
    try:
        root = ET.fromstring(resp.text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("atom:entry", ns):
            title = entry.find("atom:title", ns)
            summary = entry.find("atom:summary", ns)
            if title is not None:
                papers.append({
                    "title": " ".join(title.text.split()),
                    "summary": " ".join(summary.text.split())[:250] if summary is not None else "",
                })
    except Exception:
        pass
    return papers


def get_news_context(max_items=6):
    """Formatted string of current headlines for Hermes."""
    stories = fetch_hn_stories(n=40)

    ai_stories = [s for s in stories if AI_KEYWORDS.search(s["title"])]
    general_top = sorted(stories, key=lambda s: s["score"], reverse=True)[:4]

    # mix: mostly AI-relevant, plus a couple general top stories for variety
    pool = ai_stories + [s for s in general_top if s not in ai_stories]
    selected = random.sample(pool, min(max_items, len(pool))) if pool else []

    if not selected:
        return None

    lines = []
    for s in selected:
        lines.append(f"  - {s['title']}")
    return "\n".join(lines)


def get_paper_context(max_items=4):
    """Formatted string of recent AI papers for Hermes."""
    papers = fetch_arxiv_papers()
    if not papers:
        return None

    selected = random.sample(papers, min(max_items, len(papers)))
    lines = []
    for p in selected:
        lines.append(f"  - \"{p['title']}\" — {p['summary'][:150]}")
    return "\n".join(lines)


def get_world_context():
    """
    Returns dict with 'news' and 'papers' keys (either may be None).
    No hardcoded content — everything is live.
    """
    return {
        "news": get_news_context(),
        "papers": get_paper_context(),
    }


if __name__ == "__main__":
    ctx = get_world_context()
    for key, val in ctx.items():
        print(f"\n=== {key} ===")
        print(val or "(nothing fetched)")
