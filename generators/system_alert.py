"""
"System Alert" artifact generator.
Cascading Windows 95 / Mac OS 9 dialog boxes showing bug fixes and changes.
Visual reference: Perry Hoberman's installation work with projected UI dialogs.
"""

import random
from .artifact_base import html_wrap, escape_html, format_date, generate_artifact_meta


def generate(release):
    """Generate cascading system dialog artifact for a release."""
    meta = generate_artifact_meta(release, "system_alert")
    tag = release["tag"]
    commits = release.get("commits_sample", [])
    stats = release.get("stats", {})

    rng = random.Random(tag)

    dialogs_html = ""
    dialog_data = _build_dialogs(release, rng)

    for i, dlg in enumerate(dialog_data[:18]):
        x = 30 + rng.randint(0, 400)
        y = 20 + rng.randint(0, 300)
        z = 10 + i
        rot = rng.uniform(-3, 3)

        icon = _get_icon(dlg["type"])
        buttons = dlg.get("buttons", ["OK"])
        buttons_html = " ".join(
            f'<button class="win-btn{"" if j > 0 else " primary"}">{b}</button>'
            for j, b in enumerate(buttons)
        )

        dialogs_html += f"""
        <div class="dialog" style="left:{x}px; top:{y}px; z-index:{z}; transform:rotate({rot:.1f}deg);">
            <div class="title-bar">
                <span class="title-text">{escape_html(dlg['title'])}</span>
                <div class="title-buttons">
                    <span class="title-btn minimize">_</span>
                    <span class="title-btn maximize">□</span>
                    <span class="title-btn close">×</span>
                </div>
            </div>
            <div class="dialog-body">
                <div class="icon">{icon}</div>
                <div class="message">{escape_html(dlg['message'])}</div>
            </div>
            <div class="dialog-buttons">
                {buttons_html}
            </div>
        </div>
"""

    body = f"""
    <div class="desktop">
        <div class="desktop-icons">
            <div class="desktop-icon">
                <div class="icon-img">☤</div>
                <div class="icon-label">Hermes Agent</div>
            </div>
            <div class="desktop-icon">
                <div class="icon-img">📁</div>
                <div class="icon-label">{tag}</div>
            </div>
            <div class="desktop-icon">
                <div class="icon-img">🗑</div>
                <div class="icon-label">Recycle Bin</div>
            </div>
        </div>
{dialogs_html}
        <div class="taskbar">
            <div class="start-btn">Start</div>
            <div class="taskbar-items">
                <span class="taskbar-item active">hermes-agent — {tag}</span>
            </div>
            <div class="taskbar-clock">{format_date(release['published_at'])}</div>
        </div>
    </div>
    """

    css = """
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap');
        body {
            margin: 0;
            overflow: hidden;
            height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
        }
        .desktop {
            width: 100vw;
            height: 100vh;
            background: #008080;
            position: relative;
            overflow: hidden;
        }
        .desktop-icons {
            position: absolute;
            top: 16px;
            left: 16px;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }
        .desktop-icon {
            text-align: center;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
        }
        .icon-img { font-size: 32px; margin-bottom: 2px; }
        .icon-label { font-size: 11px; max-width: 70px; }
        .dialog {
            position: absolute;
            background: #c0c0c0;
            border: 2px solid;
            border-color: #ffffff #808080 #808080 #ffffff;
            box-shadow: 2px 2px 0px rgba(0,0,0,0.3);
            min-width: 320px;
            max-width: 480px;
            cursor: default;
            user-select: none;
        }
        .dialog:hover { z-index: 9999 !important; }
        .title-bar {
            background: linear-gradient(90deg, #000080, #1084d0);
            color: white;
            font-weight: bold;
            font-size: 12px;
            padding: 3px 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .title-text { padding-left: 2px; }
        .title-buttons { display: flex; gap: 2px; }
        .title-btn {
            width: 16px;
            height: 14px;
            background: #c0c0c0;
            border: 1px solid;
            border-color: #ffffff #808080 #808080 #ffffff;
            text-align: center;
            line-height: 12px;
            font-size: 10px;
            color: #000;
        }
        .dialog-body {
            display: flex;
            padding: 16px 20px 12px;
            gap: 14px;
            align-items: flex-start;
        }
        .icon {
            font-size: 28px;
            flex-shrink: 0;
            width: 32px;
            text-align: center;
        }
        .message {
            font-size: 12px;
            line-height: 1.5;
            color: #000;
        }
        .dialog-buttons {
            padding: 8px 20px 14px;
            display: flex;
            justify-content: center;
            gap: 8px;
        }
        .win-btn {
            min-width: 75px;
            padding: 2px 12px;
            font-size: 12px;
            background: #c0c0c0;
            border: 2px solid;
            border-color: #ffffff #808080 #808080 #ffffff;
            cursor: pointer;
            font-family: inherit;
        }
        .win-btn:active {
            border-color: #808080 #ffffff #ffffff #808080;
        }
        .win-btn.primary {
            border: 3px solid #000;
            border-color: #000000;
            padding: 1px 11px;
        }
        .taskbar {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 28px;
            background: #c0c0c0;
            border-top: 2px solid #ffffff;
            display: flex;
            align-items: center;
            padding: 0 4px;
            gap: 4px;
        }
        .start-btn {
            background: #c0c0c0;
            border: 2px solid;
            border-color: #ffffff #808080 #808080 #ffffff;
            padding: 1px 8px;
            font-weight: bold;
            font-size: 12px;
        }
        .taskbar-items { flex: 1; display: flex; gap: 4px; }
        .taskbar-item {
            background: #c0c0c0;
            border: 2px solid;
            border-color: #808080 #ffffff #ffffff #808080;
            padding: 1px 8px;
            font-size: 11px;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .taskbar-clock {
            border: 1px solid;
            border-color: #808080 #ffffff #ffffff #808080;
            padding: 1px 8px;
            font-size: 11px;
        }
    """

    js = """
    document.querySelectorAll('.dialog').forEach(dlg => {
        let isDragging = false, startX, startY, origX, origY;
        const bar = dlg.querySelector('.title-bar');
        bar.addEventListener('mousedown', e => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            origX = dlg.offsetLeft;
            origY = dlg.offsetTop;
            dlg.style.zIndex = 9999;
        });
        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            dlg.style.left = (origX + e.clientX - startX) + 'px';
            dlg.style.top = (origY + e.clientY - startY) + 'px';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
        dlg.querySelector('.close').addEventListener('click', () => {
            dlg.style.display = 'none';
        });
    });
    """

    return html_wrap(
        f"System Alert — {tag}",
        body,
        css=css,
        js=js,
        meta={"artifact-type": "system_alert", "release-tag": tag},
    ), meta


def _build_dialogs(release, rng):
    """Build dialog content from commits and release data."""
    dialogs = []
    commits = release.get("commits_sample", [])
    tag = release["tag"]
    stats = release.get("stats", {})

    if stats:
        stats_msg = ", ".join(f"{v} {k.replace('_', ' ')}" for k, v in stats.items())
        dialogs.append({
            "title": f"hermes-agent {tag}",
            "message": f"Release summary: {stats_msg}",
            "type": "info",
            "buttons": ["OK"],
        })

    for c in commits[:14]:
        msg = c["message"]
        if msg.startswith("fix"):
            dtype = "warning"
            title = "Bug Fix Applied"
            buttons = ["Acknowledge", "Details..."]
        elif msg.startswith("feat"):
            dtype = "info"
            title = "New Feature"
            buttons = ["OK"]
        elif msg.startswith("chore") or msg.startswith("refactor"):
            dtype = "question"
            title = "Maintenance"
            buttons = ["Continue", "Skip"]
        elif msg.startswith("docs"):
            dtype = "info"
            title = "Documentation Update"
            buttons = ["OK"]
        elif "breaking" in msg.lower() or "BREAKING" in msg:
            dtype = "error"
            title = "⚠ Breaking Change"
            buttons = ["Accept", "Revert", "Ignore"]
        else:
            dtype = rng.choice(["info", "warning", "question"])
            title = "Commit Applied"
            buttons = ["OK"]

        dialogs.append({
            "title": title,
            "message": msg,
            "type": dtype,
            "buttons": buttons,
        })

    return dialogs


def _get_icon(dtype):
    icons = {
        "info": "ℹ️",
        "warning": "⚠️",
        "error": "🛑",
        "question": "❓",
    }
    return icons.get(dtype, "ℹ️")
