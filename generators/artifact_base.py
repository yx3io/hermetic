"""
Shared HTML scaffold and utilities for all artifact generators.
Every artifact is a self-contained HTML file with no external dependencies.
"""

import hashlib
from datetime import datetime


P5_CDN = "https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js"


def html_wrap(title, body_html, css="", js="", meta=None, include_p5=False):
    """Wrap body content in a complete HTML document."""
    meta = meta or {}
    meta_tags = "\n".join(
        f'    <meta name="{k}" content="{v}">'
        for k, v in meta.items()
    )
    p5_tag = f'    <script src="{P5_CDN}"></script>' if include_p5 else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="generator" content="hermes-archaeology-museum">
{meta_tags}
    <title>{title}</title>
{p5_tag}
    <style>
        *, *::before, *::after {{ margin: 0; padding: 0; box-sizing: border-box; }}
        html {{ -webkit-font-smoothing: antialiased; }}
{css}
    </style>
</head>
<body>
{body_html}
{f'<script>{js}</script>' if js else ''}
</body>
</html>"""


def artifact_id(tag, artifact_type):
    """Deterministic ID for an artifact."""
    raw = f"{tag}-{artifact_type}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def format_date(iso_str):
    """'2026-04-03T18:14:55Z' -> 'Apr 03, 2026'"""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.strftime("%b %d, %Y")
    except Exception:
        return iso_str[:10]


def format_date_short(iso_str):
    """'2026-04-03T18:14:55Z' -> '2026-04-03'"""
    return iso_str[:10] if iso_str else "unknown"


def format_size(n):
    """Humanize a number as a file-size-like string."""
    if n < 1024:
        return f"{n}"
    elif n < 1024 * 1024:
        return f"{n / 1024:.1f}K"
    else:
        return f"{n / (1024 * 1024):.1f}M"


def escape_html(s):
    """Minimal HTML escaping."""
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def color_lerp(t, c1=(70, 130, 180), c2=(220, 120, 50)):
    """Linear interpolation between two RGB colors. t in [0, 1]."""
    t = max(0.0, min(1.0, t))
    r = int(c1[0] + (c2[0] - c1[0]) * t)
    g = int(c1[1] + (c2[1] - c1[1]) * t)
    b = int(c1[2] + (c2[2] - c1[2]) * t)
    return f"rgb({r},{g},{b})"


def generate_artifact_meta(release, artifact_type):
    """Build metadata dict for an artifact."""
    return {
        "id": artifact_id(release["tag"], artifact_type),
        "tag": release["tag"],
        "type": artifact_type,
        "title": _make_title(release, artifact_type),
        "date": release["published_at"],
        "release_name": release.get("name", release["tag"]),
        "themes": release.get("themes", []),
        "stats": release.get("stats", {}),
    }


def _make_title(release, artifact_type):
    """Generate an evocative title for the artifact."""
    tag = release["tag"]
    name = release.get("name", tag)
    type_titles = {
        "index_of": f"Index of /{tag}/",
        "system_alert": f"System Alert — {tag}",
        "network_topology": f"Topology: {tag}",
        "heat_grid": f"Churn Map [{tag}]",
        "terminal_archaeology": f"term://hermes@{tag}",
        "petri_culture": f"Culture #{tag}",
        "layered_composition": f"{name}",
    }
    return type_titles.get(artifact_type, f"Artifact {tag}")
