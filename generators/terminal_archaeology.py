"""
"Terminal Archaeology" artifact generator.
Green phosphor terminal dump showing commit messages and diff snippets.
Classic terminal / mainframe aesthetic.
"""

from .artifact_base import html_wrap, escape_html, format_date_short, generate_artifact_meta


def generate(release):
    """Generate a terminal archaeology artifact for a release."""
    meta = generate_artifact_meta(release, "terminal_archaeology")
    tag = release["tag"]
    commits = release.get("commits_sample", [])
    files = release.get("compare", {}).get("files", [])
    stats = release.get("stats", {})
    date_str = format_date_short(release["published_at"])

    lines = []
    lines.append("")
    lines.append(f"  ╔══════════════════════════════════════════════════════════════════╗")
    lines.append(f"  ║  HERMES AGENT — ARCHAEOLOGICAL TERMINAL RECORD                  ║")
    lines.append(f"  ║  Release: {tag:<20s}  Date: {date_str:<24s}  ║")
    lines.append(f"  ╚══════════════════════════════════════════════════════════════════╝")
    lines.append("")

    if stats:
        stat_max = max(stats.values()) or 1
        lines.append("  ┌─ RELEASE STATISTICS ─────────────────────────────────────────────┐")
        for k, v in stats.items():
            label = k.replace("_", " ").upper()
            bar_len = min(40, max(1, int(v / stat_max * 40)))
            bar = "█" * bar_len + "░" * (40 - bar_len)
            lines.append(f"  │ {label:<18s} {bar} {v:>6,d} │")
        lines.append("  └─────────────────────────────────────────────────────────────────┘")
        lines.append("")

    if files:
        by_status = {}
        for f in files:
            by_status.setdefault(f["status"], []).append(f)

        lines.append("  ┌─ FILE DELTA ─────────────────────────────────────────────────────┐")
        for status in ["added", "modified", "removed", "renamed"]:
            group = by_status.get(status, [])
            if not group:
                continue
            icon = {"added": "++", "modified": "~~", "removed": "--", "renamed": ">>"}.get(status, "??")
            lines.append(f"  │ [{icon}] {status.upper()}: {len(group)} files")
            for f in group[:6]:
                name = f["filename"]
                if len(name) > 52:
                    name = "..." + name[-49:]
                lines.append(f"  │     {name:<52s} +{f['additions']:<5d} -{f['deletions']:<5d}")
            if len(group) > 6:
                lines.append(f"  │     ... and {len(group) - 6} more")
            lines.append("  │")
        lines.append("  └─────────────────────────────────────────────────────────────────┘")
        lines.append("")

    if commits:
        lines.append("  ┌─ COMMIT LOG ─────────────────────────────────────────────────────┐")
        for c in commits[:25]:
            sha = c["sha"]
            msg = c["message"]
            if len(msg) > 54:
                msg = msg[:51] + "..."
            date = c["date"][:10]
            lines.append(f"  │ <span class='sha'>{sha}</span> {escape_html(msg):<54s} {date} │")
        if len(commits) > 25:
            lines.append(f"  │ ... {len(commits) - 25} more commits")
        lines.append("  └─────────────────────────────────────────────────────────────────┘")

    lines.append("")
    lines.append(f"  hermes-archaeology-museum // generated {date_str}")
    lines.append(f"  $ _")

    terminal_content = "\n".join(lines)

    body = f"""
    <div class="terminal">
        <div class="terminal-header">
            <div class="dots">
                <span class="dot red"></span>
                <span class="dot yellow"></span>
                <span class="dot green"></span>
            </div>
            <div class="terminal-title">hermes@archaeology ~ {escape_html(tag)}</div>
        </div>
        <div class="terminal-body">
            <pre class="output">{terminal_content}</pre>
            <div class="scanline"></div>
        </div>
    </div>
    """

    css = """
        @keyframes flicker {
            0%, 100% { opacity: 1; }
            92% { opacity: 1; }
            93% { opacity: 0.8; }
            94% { opacity: 1; }
        }
        @keyframes scanline {
            0% { top: -2px; }
            100% { top: 100%; }
        }
        @keyframes blink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
        }
        body {
            margin: 0;
            background: #0a0a0a;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .terminal {
            width: 100%;
            max-width: 900px;
            background: #0d1a0d;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 40px rgba(0, 255, 70, 0.08), inset 0 0 80px rgba(0,0,0,0.5);
            animation: flicker 8s infinite;
        }
        .terminal-header {
            background: #1a1a1a;
            padding: 8px 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid #222;
        }
        .dots { display: flex; gap: 6px; }
        .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        .dot.red { background: #ff5f56; }
        .dot.yellow { background: #ffbd2e; }
        .dot.green { background: #27c93f; }
        .terminal-title {
            color: #556;
            font-size: 12px;
            font-family: 'Courier New', monospace;
        }
        .terminal-body {
            position: relative;
            padding: 20px;
            min-height: 500px;
            overflow: auto;
            max-height: 90vh;
        }
        .output {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12.5px;
            line-height: 1.5;
            color: #33ff66;
            white-space: pre;
            text-shadow: 0 0 5px rgba(51, 255, 102, 0.3);
        }
        .sha {
            color: #66aaff;
        }
        .scanline {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: rgba(51, 255, 102, 0.06);
            animation: scanline 6s linear infinite;
            pointer-events: none;
        }
    """

    return html_wrap(
        f"Terminal Archaeology — {tag}",
        body,
        css=css,
        meta={"artifact-type": "terminal_archaeology", "release-tag": tag},
    ), meta
