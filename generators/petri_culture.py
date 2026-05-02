"""
"Petri Culture" artifact generator.
Canvas-based circular growth pattern — colonies of code changes.
Visual reference: Eduardo Kac's Genesis (1999) — biological growth as data art.
"""

import math
import random
from .artifact_base import html_wrap, escape_html, generate_artifact_meta


def generate(release):
    """Generate a petri culture canvas artifact for a release."""
    meta = generate_artifact_meta(release, "petri_culture")
    tag = release["tag"]
    files = release.get("compare", {}).get("files", [])
    stats = release.get("stats", {})
    commits = release.get("commits_sample", [])

    rng = random.Random(tag + "petri")

    colonies = _build_colonies(files, rng)
    colonies_json = _serialize_colonies(colonies)

    n_commits = stats.get("commits", len(commits))
    n_contributors = stats.get("contributors", 0)
    n_files = len(files)
    total_adds = sum(f["additions"] for f in files)

    stats_text = f"{n_files} files / {total_adds:,} insertions / {n_commits} commits"
    if n_contributors:
        stats_text += f" / {n_contributors} contributors"

    body = f"""
    <div class="container">
        <div class="header">
            <div class="label">CULTURE #{escape_html(tag)}</div>
            <div class="stats">{escape_html(stats_text)}</div>
        </div>
        <div class="dish-frame">
            <canvas id="petri" width="800" height="800"></canvas>
            <div class="dish-label">{escape_html(tag)} — {escape_html(release['published_at'][:10])}</div>
        </div>
        <div class="legend">
            <span><i style="background:#4ae68a"></i> agent/</span>
            <span><i style="background:#e6c74a"></i> tools/</span>
            <span><i style="background:#e64a7b"></i> tests/</span>
            <span><i style="background:#4a8ae6"></i> docs/</span>
            <span><i style="background:#c74ae6"></i> gateway/</span>
            <span><i style="background:#e6884a"></i> other</span>
        </div>
    </div>
    """

    css = """
        body {
            margin: 0;
            background: #0a0a10;
            color: #aab;
            font-family: 'Courier New', monospace;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container { text-align: center; }
        .header { margin-bottom: 16px; }
        .label {
            font-size: 14px;
            letter-spacing: 4px;
            color: #778;
        }
        .stats {
            font-size: 11px;
            color: #556;
            margin-top: 4px;
        }
        .dish-frame {
            position: relative;
            display: inline-block;
        }
        canvas {
            width: min(80vw, 800px);
            height: min(80vw, 800px);
            border-radius: 50%;
            border: 2px solid #2a2a35;
            box-shadow: 0 0 60px rgba(100,100,140,0.08), inset 0 0 80px rgba(0,0,0,0.3);
            background: radial-gradient(ellipse at 35% 35%, #16161e, #0c0c12);
        }
        .dish-label {
            position: absolute;
            bottom: -24px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            color: #445;
            white-space: nowrap;
        }
        .legend {
            margin-top: 36px;
            display: flex;
            justify-content: center;
            gap: 16px;
            font-size: 10px;
            color: #556;
        }
        .legend i {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 4px;
            vertical-align: middle;
        }
    """

    js = f"""
    const colonies = {colonies_json};
    const canvas = document.getElementById('petri');
    const ctx = canvas.getContext('2d');
    const W = 800, H = 800, CX = 400, CY = 400, R = 370;

    function drawDish() {{
        ctx.clearRect(0, 0, W, H);

        // dish background gradient
        const grad = ctx.createRadialGradient(CX*0.85, CY*0.85, 0, CX, CY, R);
        grad.addColorStop(0, '#16161e');
        grad.addColorStop(1, '#0c0c12');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(CX, CY, R, 0, Math.PI * 2);
        ctx.fill();

        // subtle grid
        ctx.strokeStyle = 'rgba(100,100,140,0.04)';
        ctx.lineWidth = 0.5;
        for (let i = -R; i <= R; i += 20) {{
            ctx.beginPath();
            ctx.moveTo(CX + i, CY - R);
            ctx.lineTo(CX + i, CY + R);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(CX - R, CY + i);
            ctx.lineTo(CX + R, CY + i);
            ctx.stroke();
        }}
    }}

    let particles = [];
    colonies.forEach(col => {{
        const count = Math.min(col.weight * 3, 200);
        for (let i = 0; i < count; i++) {{
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * col.radius;
            particles.push({{
                x: col.x + Math.cos(angle) * dist,
                y: col.y + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                color: col.color,
                size: 1 + Math.random() * 2.5,
                alpha: 0.3 + Math.random() * 0.5,
                homeX: col.x,
                homeY: col.y,
                homeR: col.radius,
            }});
        }}
    }});

    function animate() {{
        drawDish();

        particles.forEach(p => {{
            p.x += p.vx;
            p.y += p.vy;

            // drift back toward colony center
            const dx = p.homeX - p.x;
            const dy = p.homeY - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > p.homeR * 1.2) {{
                p.vx += dx * 0.001;
                p.vy += dy * 0.001;
            }}

            // stay inside dish
            const cx = p.x - CX, cy = p.y - CY;
            if (Math.sqrt(cx*cx + cy*cy) > R - 10) {{
                p.vx *= -0.8;
                p.vy *= -0.8;
                p.x += (CX - p.x) * 0.05;
                p.y += (CY - p.y) * 0.05;
            }}

            // random jitter
            p.vx += (Math.random() - 0.5) * 0.06;
            p.vy += (Math.random() - 0.5) * 0.06;
            p.vx *= 0.98;
            p.vy *= 0.98;

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }});

        ctx.globalAlpha = 1;
        requestAnimationFrame(animate);
    }}

    animate();
    """

    return html_wrap(
        f"Petri Culture — {tag}",
        body,
        css=css,
        js=js,
        meta={"artifact-type": "petri_culture", "release-tag": tag},
    ), meta


def _build_colonies(files, rng):
    """Group files into colonies by top-level directory."""
    dir_colors = {
        "agent": "#4ae68a",
        "tools": "#e6c74a",
        "tests": "#e64a7b",
        "docs": "#4a8ae6",
        "gateway": "#c74ae6",
        "scripts": "#e6884a",
        "skills": "#6ae6d0",
        "src": "#8aaa44",
    }
    default_color = "#e6884a"

    groups = {}
    for f in files:
        parts = f["filename"].split("/")
        top_dir = parts[0] if len(parts) > 1 else "root"
        if top_dir not in groups:
            groups[top_dir] = {"weight": 0, "additions": 0}
        groups[top_dir]["weight"] += 1
        groups[top_dir]["additions"] += f["additions"]

    CX, CY, R = 400, 400, 320
    colonies = []
    n = len(groups)
    for i, (dirname, data) in enumerate(sorted(groups.items(), key=lambda x: -x[1]["weight"])):
        angle = (2 * math.pi * i / max(n, 1)) + rng.uniform(-0.3, 0.3)
        dist = rng.uniform(60, R * 0.7)
        x = CX + math.cos(angle) * dist
        y = CY + math.sin(angle) * dist
        radius = max(20, min(120, data["weight"] * 2.5))
        color = dir_colors.get(dirname, default_color)

        colonies.append({
            "name": dirname,
            "x": round(x, 1),
            "y": round(y, 1),
            "radius": round(radius, 1),
            "weight": data["weight"],
            "color": color,
        })

    return colonies


def _serialize_colonies(colonies):
    """Serialize to JSON string for embedding in JS."""
    import json
    return json.dumps(colonies)
