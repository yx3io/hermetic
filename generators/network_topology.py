"""
"Network Topology" artifact generator.
SVG force-directed-style graph of file/module relationships.
Visual reference: I/O/D WebStalker (1997) — deconstructed web as node-link diagram.
"""

import math
import random
from collections import defaultdict
from .artifact_base import html_wrap, escape_html, generate_artifact_meta


def generate(release):
    """Generate a network topology SVG artifact for a release."""
    meta = generate_artifact_meta(release, "network_topology")
    tag = release["tag"]
    files = release.get("compare", {}).get("files", [])

    rng = random.Random(tag + "network")
    nodes, edges = _build_graph(files)
    positions = _layout(nodes, edges, rng)

    W, H = 1200, 800
    svg_edges = ""
    for (a, b, weight) in edges:
        if a in positions and b in positions:
            x1, y1 = positions[a]
            x2, y2 = positions[b]
            opacity = min(0.8, 0.15 + weight * 0.1)
            svg_edges += (
                f'<line x1="{x1:.1f}" y1="{y1:.1f}" '
                f'x2="{x2:.1f}" y2="{y2:.1f}" '
                f'stroke="#00ff88" stroke-opacity="{opacity:.2f}" '
                f'stroke-width="{max(0.5, weight * 0.3):.1f}"/>\n'
            )

    svg_nodes = ""
    for name, data in nodes.items():
        if name not in positions:
            continue
        x, y = positions[name]
        r = max(3, min(14, data["weight"] * 1.5))
        color = _status_color(data["dominant_status"])
        label = name.split("/")[-1] if "/" in name else name
        if len(label) > 20:
            label = label[:18] + ".."

        svg_nodes += (
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" '
            f'fill="{color}" fill-opacity="0.7" '
            f'stroke="{color}" stroke-width="0.5" class="node"/>\n'
            f'<text x="{x + r + 3:.1f}" y="{y + 3:.1f}" '
            f'fill="#00dd66" font-size="9" opacity="0.6" class="label">'
            f'{escape_html(label)}</text>\n'
        )

    stats = release.get("stats", {})
    stats_text = " / ".join(f"{v} {k.replace('_',' ')}" for k, v in stats.items() if v)

    body = f"""
    <div class="container">
        <div class="header">
            <div class="title">NETWORK TOPOLOGY — {escape_html(tag)}</div>
            <div class="subtitle">{escape_html(stats_text)}</div>
            <div class="legend">
                <span class="leg"><i style="color:#00ff88">●</i> added</span>
                <span class="leg"><i style="color:#ffaa00">●</i> modified</span>
                <span class="leg"><i style="color:#ff4444">●</i> removed</span>
                <span class="leg"><i style="color:#8888ff">●</i> renamed</span>
            </div>
        </div>
        <svg viewBox="0 0 {W} {H}" class="graph">
            <defs>
                <radialGradient id="glow">
                    <stop offset="0%" stop-color="#00ff88" stop-opacity="0.1"/>
                    <stop offset="100%" stop-color="#00ff88" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <rect width="{W}" height="{H}" fill="transparent"/>
            <g class="edges">{svg_edges}</g>
            <g class="nodes">{svg_nodes}</g>
        </svg>
        <div class="footer">{len(nodes)} nodes / {len(edges)} edges — hermes-agent {escape_html(tag)}</div>
    </div>
    """

    css = """
        body {
            margin: 0;
            background: #0a0a0a;
            color: #00dd66;
            font-family: 'Courier New', monospace;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container { width: 100%; max-width: 1200px; padding: 20px; }
        .header { margin-bottom: 12px; }
        .title {
            font-size: 16px;
            letter-spacing: 3px;
            color: #00ff88;
        }
        .subtitle {
            font-size: 11px;
            color: #448855;
            margin-top: 4px;
        }
        .legend {
            margin-top: 8px;
            display: flex;
            gap: 16px;
            font-size: 10px;
            color: #556655;
        }
        .leg i { font-style: normal; }
        .graph {
            width: 100%;
            height: auto;
            border: 1px solid #1a3322;
            background: #060606;
        }
        .node { cursor: pointer; }
        .node:hover { fill-opacity: 1 !important; }
        .label { pointer-events: none; font-family: 'Courier New', monospace; }
        .footer {
            margin-top: 8px;
            font-size: 10px;
            color: #334433;
            text-align: right;
        }
    """

    js = """
    document.querySelectorAll('.node').forEach(node => {
        node.addEventListener('mouseenter', () => {
            node.setAttribute('r', parseFloat(node.getAttribute('r')) * 1.5);
        });
        node.addEventListener('mouseleave', () => {
            node.setAttribute('r', parseFloat(node.getAttribute('r')) / 1.5);
        });
    });
    """

    return html_wrap(
        f"Network Topology — {tag}",
        body,
        css=css,
        js=js,
        meta={"artifact-type": "network_topology", "release-tag": tag},
    ), meta


def _build_graph(files):
    """Build nodes and edges from file list. Nodes = directories, edges = shared parent."""
    nodes = {}
    dir_files = defaultdict(list)

    for f in files:
        parts = f["filename"].split("/")
        if len(parts) > 1:
            directory = "/".join(parts[:-1])
        else:
            directory = "."
        fname = parts[-1]

        node_key = f["filename"] if len(files) < 80 else directory
        if node_key not in nodes:
            nodes[node_key] = {"weight": 0, "statuses": []}
        nodes[node_key]["weight"] += 1
        nodes[node_key]["statuses"].append(f["status"])
        dir_files[directory].append(f["filename"])

    for name, data in nodes.items():
        statuses = data["statuses"]
        data["dominant_status"] = max(set(statuses), key=statuses.count)

    edges = []
    edge_set = set()
    dirs_list = list(dir_files.keys())
    for i, d1 in enumerate(dirs_list):
        for d2 in dirs_list[i + 1:]:
            parts1 = set(d1.split("/"))
            parts2 = set(d2.split("/"))
            shared = len(parts1 & parts2)
            if shared > 0:
                n1 = d1 if d1 in nodes else (dir_files[d1][0] if dir_files[d1] else None)
                n2 = d2 if d2 in nodes else (dir_files[d2][0] if dir_files[d2] else None)
                if n1 and n2 and n1 in nodes and n2 in nodes:
                    key = tuple(sorted([n1, n2]))
                    if key not in edge_set:
                        edge_set.add(key)
                        edges.append((n1, n2, shared))

    if len(edges) < len(nodes) // 2:
        node_list = list(nodes.keys())
        rng = random.Random("topology-fill")
        for _ in range(len(nodes)):
            a = rng.choice(node_list)
            b = rng.choice(node_list)
            if a != b:
                key = tuple(sorted([a, b]))
                if key not in edge_set:
                    edge_set.add(key)
                    edges.append((a, b, 1))

    return nodes, edges


def _layout(nodes, edges, rng, W=1200, H=800):
    """Simple force-directed layout."""
    positions = {}
    for name in nodes:
        positions[name] = (rng.uniform(100, W - 100), rng.uniform(80, H - 80))

    adj = defaultdict(list)
    for a, b, w in edges:
        adj[a].append((b, w))
        adj[b].append((a, w))

    for iteration in range(120):
        forces = {n: [0.0, 0.0] for n in nodes}
        t = 1.0 - iteration / 120

        node_list = list(nodes.keys())
        for i, n1 in enumerate(node_list):
            x1, y1 = positions[n1]
            for n2 in node_list[i + 1:]:
                x2, y2 = positions[n2]
                dx = x2 - x1
                dy = y2 - y1
                dist = max(math.sqrt(dx * dx + dy * dy), 1)
                repulsion = 8000 / (dist * dist)
                fx = dx / dist * repulsion
                fy = dy / dist * repulsion
                forces[n1][0] -= fx
                forces[n1][1] -= fy
                forces[n2][0] += fx
                forces[n2][1] += fy

        for a, b, w in edges:
            if a in positions and b in positions:
                x1, y1 = positions[a]
                x2, y2 = positions[b]
                dx = x2 - x1
                dy = y2 - y1
                dist = max(math.sqrt(dx * dx + dy * dy), 1)
                ideal = 80
                attraction = (dist - ideal) * 0.01
                fx = dx / dist * attraction
                fy = dy / dist * attraction
                forces[a][0] += fx
                forces[a][1] += fy
                forces[b][0] -= fx
                forces[b][1] -= fy

        for name in nodes:
            x, y = positions[name]
            fx, fy = forces[name]
            speed = max(0.5, 3 * t)
            x += max(-speed, min(speed, fx * 0.1))
            y += max(-speed, min(speed, fy * 0.1))
            x = max(40, min(W - 40, x))
            y = max(40, min(H - 40, y))
            positions[name] = (x, y)

    return positions


def _status_color(status):
    return {
        "added": "#00ff88",
        "modified": "#ffaa00",
        "removed": "#ff4444",
        "renamed": "#8888ff",
    }.get(status, "#00ff88")
