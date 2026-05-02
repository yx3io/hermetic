"""
"Heat Grid" artifact generator.
Colored tile matrix showing file-level code churn.
Visual reference: The blue/orange tile heatmaps from data visualization art.
"""

import math
from .artifact_base import html_wrap, escape_html, color_lerp, generate_artifact_meta


def generate(release):
    """Generate a heat grid tile artifact for a release."""
    meta = generate_artifact_meta(release, "heat_grid")
    tag = release["tag"]
    files = release.get("compare", {}).get("files", [])
    stats = release.get("stats", {})

    if not files:
        files = [{"filename": "hermes-agent", "additions": 1, "deletions": 0,
                  "changes": 1, "status": "modified"}]

    max_churn = max(f["changes"] for f in files) if files else 1
    max_churn = max(max_churn, 1)

    cols = math.ceil(math.sqrt(len(files) * 1.5))
    cols = max(cols, 8)

    tiles_html = ""
    for i, f in enumerate(sorted(files, key=lambda x: -x["changes"])):
        t = f["changes"] / max_churn
        if f["status"] == "added":
            color = color_lerp(t, c1=(40, 80, 60), c2=(0, 220, 120))
        elif f["status"] == "removed":
            color = color_lerp(t, c1=(80, 40, 40), c2=(220, 50, 50))
        else:
            color = color_lerp(t, c1=(50, 80, 120), c2=(220, 140, 50))

        name = f["filename"].split("/")[-1]
        if len(name) > 14:
            name = name[:12] + ".."
        full_path = escape_html(f["filename"])
        adds = f["additions"]
        dels = f["deletions"]

        opacity = 0.4 + 0.6 * t
        tiles_html += (
            f'<div class="tile" style="background:{color}; opacity:{opacity:.2f}" '
            f'title="{full_path}\n+{adds} -{dels}" '
            f'data-path="{full_path}" data-adds="{adds}" data-dels="{dels}">'
            f'<span class="tile-label">{escape_html(name)}</span>'
            f'</div>\n'
        )

    stats_text = " | ".join(f"{v} {k.replace('_',' ')}" for k, v in stats.items() if v)
    total_adds = sum(f["additions"] for f in files)
    total_dels = sum(f["deletions"] for f in files)

    body = f"""
    <div class="container">
        <div class="header">
            <h1>CHURN MAP [{escape_html(tag)}]</h1>
            <div class="stats">{escape_html(stats_text)}</div>
            <div class="stats">+{total_adds} insertions / -{total_dels} deletions / {len(files)} files</div>
        </div>
        <div class="grid" style="grid-template-columns: repeat({cols}, 1fr);">
{tiles_html}
        </div>
        <div class="scale">
            <div class="scale-bar"></div>
            <div class="scale-labels">
                <span>0 changes</span>
                <span>{max_churn} changes</span>
            </div>
        </div>
        <div class="tooltip" id="tooltip"></div>
    </div>
    """

    css = f"""
        body {{
            margin: 0;
            background: #111118;
            color: #889;
            font-family: 'Courier New', monospace;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            padding: 30px 20px;
        }}
        .container {{ max-width: 1200px; width: 100%; }}
        .header {{ margin-bottom: 20px; }}
        h1 {{
            font-size: 15px;
            font-weight: normal;
            letter-spacing: 4px;
            color: #aab;
            margin-bottom: 6px;
        }}
        .stats {{
            font-size: 11px;
            color: #556;
            margin-top: 2px;
        }}
        .grid {{
            display: grid;
            gap: 2px;
            margin: 20px 0;
        }}
        .tile {{
            aspect-ratio: 1;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding: 2px;
            cursor: crosshair;
            transition: opacity 0.15s, transform 0.15s;
            position: relative;
            overflow: hidden;
        }}
        .tile:hover {{
            opacity: 1 !important;
            transform: scale(1.3);
            z-index: 10;
            box-shadow: 0 0 8px rgba(255,255,255,0.2);
        }}
        .tile-label {{
            font-size: 7px;
            color: rgba(255,255,255,0.5);
            text-align: center;
            word-break: break-all;
            line-height: 1;
            max-height: 100%;
            overflow: hidden;
        }}
        .tile:hover .tile-label {{
            color: rgba(255,255,255,0.9);
            font-size: 8px;
        }}
        .scale {{ margin-top: 16px; }}
        .scale-bar {{
            height: 8px;
            background: linear-gradient(90deg, rgb(50,80,120), rgb(120,110,85), rgb(220,140,50));
            border-radius: 1px;
        }}
        .scale-labels {{
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #556;
            margin-top: 4px;
        }}
        .tooltip {{
            position: fixed;
            background: #1a1a22;
            border: 1px solid #334;
            color: #aab;
            font-size: 11px;
            padding: 6px 10px;
            pointer-events: none;
            display: none;
            z-index: 100;
            font-family: 'Courier New', monospace;
            white-space: pre;
        }}
    """

    js = """
    const tooltip = document.getElementById('tooltip');
    document.querySelectorAll('.tile').forEach(tile => {
        tile.addEventListener('mouseenter', e => {
            const path = tile.dataset.path;
            const adds = tile.dataset.adds;
            const dels = tile.dataset.dels;
            tooltip.textContent = path + '\\n+' + adds + ' -' + dels;
            tooltip.style.display = 'block';
        });
        tile.addEventListener('mousemove', e => {
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top = (e.clientY + 14) + 'px';
        });
        tile.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
    """

    return html_wrap(
        f"Heat Grid — {tag}",
        body,
        css=css,
        js=js,
        meta={"artifact-type": "heat_grid", "release-tag": tag},
    ), meta
