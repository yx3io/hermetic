"""
"Signal Bars" artifact generator.
Horizontal barcode / spectrogram showing file-level activity.
Each file is a horizontal bar. Width = churn. Color = status.
Reads like a seismograph of code change.
"""

import random
import hashlib
from .artifact_base import html_wrap, escape_html, generate_artifact_meta


STATUS_COLORS = {
    "added": {"fill": "#3fb950", "label": "+"},
    "removed": {"fill": "#f85149", "label": "−"},
    "modified": {"fill": "#58a6ff", "label": "~"},
    "renamed": {"fill": "#d2a8ff", "label": "→"},
}


def generate(release):
    meta = generate_artifact_meta(release, "signal_bars")
    tag = release["tag"]
    files = release.get("compare", {}).get("files", [])
    commits = release.get("commits_sample", [])
    stats = release.get("stats", {})

    seed_int = int(hashlib.md5(tag.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed_int)

    if not files:
        for c in commits[:20]:
            files.append({
                "filename": c.get("sha", "")[:8] + ".patch",
                "status": "modified",
                "additions": rng.randint(1, 30),
                "deletions": rng.randint(0, 15),
                "changes": rng.randint(1, 45),
            })

    sorted_files = sorted(files, key=lambda f: -f.get("changes", 0))[:80]
    max_churn = max((f.get("changes", 1) for f in sorted_files), default=1) or 1

    W, H = 1200, 900
    bar_area_top = 60
    bar_area_bottom = H - 80
    bar_count = len(sorted_files)
    if bar_count == 0:
        bar_count = 1

    bar_h = max(2, min(16, (bar_area_bottom - bar_area_top) / bar_count))
    gap = max(1, min(3, (bar_area_bottom - bar_area_top - bar_count * bar_h) / max(bar_count - 1, 1)))

    # Build bar data
    bars_js = []
    for i, f in enumerate(sorted_files):
        status = f.get("status", "modified")
        color = STATUS_COLORS.get(status, STATUS_COLORS["modified"])["fill"]
        churn = f.get("changes", 1)
        norm = churn / max_churn
        adds = f.get("additions", 0)
        dels = f.get("deletions", 0)

        name = f["filename"].split("/")[-1] if "/" in f["filename"] else f["filename"]
        if len(name) > 30:
            name = name[:28] + ".."
        dir_name = "/".join(f["filename"].split("/")[:-1]) if "/" in f["filename"] else ""

        bars_js.append({
            "n": name,
            "d": dir_name[:30],
            "s": status,
            "c": color,
            "w": norm,
            "a": adds,
            "dl": dels,
            "ch": churn,
        })

    # Status counts
    s_counts = {}
    for f in sorted_files:
        s = f.get("status", "modified")
        s_counts[s] = s_counts.get(s, 0) + 1

    commit_texts = [c.get("message", "")[:60].replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"') for c in commits[:15]]

    js = f"""(function(){{
var W={W},H={H},seed={seed_int};
var c=document.getElementById('c');
c.width=W;c.height=H;
var x=c.getContext('2d');
var bars={bars_js.__repr__().replace("'", '"').replace('True','true').replace('False','false')};
var commits={commit_texts.__repr__().replace("'", '"')};
var sCounts={s_counts.__repr__().replace("'", '"')};

var _s=seed;
function R(){{_s=(_s*16807)%2147483647;return(_s&0x7fffffff)/2147483647;}}

// Background
x.fillStyle='#0a0a12';
x.fillRect(0,0,W,H);

// Subtle vertical grid lines
x.strokeStyle='#1a1a2a';
x.lineWidth=1;
for(var gx=200;gx<W-40;gx+=50){{
  x.beginPath();x.moveTo(gx,40);x.lineTo(gx,H-60);x.stroke();
}}

// Title
x.font='11px monospace';
x.fillStyle='#4a4a6a';
x.fillText('{escape_html(tag)}',12,24);
x.fillText('signal analysis — '+bars.length+' files',12,38);

// Bars
var barTop={bar_area_top};
var barH={bar_h};
var gap={gap};
var labelW=190;
var barMaxW=W-labelW-60;

for(var i=0;i<bars.length;i++){{
  var b=bars[i];
  var y=barTop+i*(barH+gap);
  if(y+barH>H-60)break;
  var bw=Math.max(2,b.w*barMaxW);

  // File label
  x.font='8px monospace';
  x.fillStyle='#4a4a6a';
  x.textAlign='right';
  x.fillText(b.n,labelW-8,y+barH-2);

  // Bar
  if(b.s==='removed'){{
    // Negative space: dashed outline only
    x.strokeStyle=b.c;
    x.globalAlpha=0.5;
    x.lineWidth=1;
    x.setLineDash([3,3]);
    x.strokeRect(labelW,y,bw,barH);
    x.setLineDash([]);
    x.globalAlpha=1;
  }} else if(b.s==='modified'){{
    // Hatched: additions solid, deletions striped
    var addW=b.a/(b.a+b.dl+0.01)*bw;
    var delW=bw-addW;
    x.fillStyle=b.c;
    x.globalAlpha=0.6;
    x.fillRect(labelW,y,addW,barH);
    // Stripe for deletion portion
    x.globalAlpha=0.25;
    x.fillRect(labelW+addW,y,delW,barH);
    x.save();
    x.beginPath();x.rect(labelW+addW,y,delW,barH);x.clip();
    x.strokeStyle=b.c;x.lineWidth=1;x.globalAlpha=0.4;
    for(var hx=0;hx<delW+barH;hx+=4){{
      x.beginPath();x.moveTo(labelW+addW+hx,y);x.lineTo(labelW+addW+hx-barH,y+barH);x.stroke();
    }}
    x.restore();
    x.globalAlpha=1;
  }} else if(b.s==='renamed'){{
    // Solid with arrow marker
    x.fillStyle=b.c;
    x.globalAlpha=0.5;
    x.fillRect(labelW,y,bw,barH);
    // Arrow symbol
    x.fillStyle='#0a0a12';
    x.globalAlpha=0.8;
    x.font=(barH-1)+'px monospace';
    x.textAlign='left';
    x.fillText('\\u2192',labelW+bw-barH*1.5,y+barH-2);
    x.globalAlpha=1;
  }} else {{
    // Added: solid
    x.fillStyle=b.c;
    x.globalAlpha=0.7;
    x.fillRect(labelW,y,bw,barH);
    x.globalAlpha=1;
  }}

  // Churn count
  x.textAlign='left';
  x.font='7px monospace';
  x.fillStyle='#3a3a5a';
  x.fillText(b.ch+'',labelW+bw+6,y+barH-2);
}}

x.textAlign='left';

// Scattered commit text (atmospheric, bottom area)
x.globalAlpha=0.06;
for(var i=0;i<commits.length;i++){{
  var tx=labelW+R()*barMaxW;
  var ty=barTop+R()*(H-barTop-80);
  x.font=(6+R()*6)+'px monospace';
  x.fillStyle='#8888cc';
  x.fillText(commits[i],tx,ty);
}}
x.globalAlpha=1;

// Legend
var lx=W-140,ly=H-52;
x.fillStyle='#0a0a12';x.globalAlpha=0.8;x.fillRect(lx-8,ly-10,140,48);
x.globalAlpha=1;
x.font='8px monospace';
var legendItems=[
  ['added','#3fb950','+ added'],
  ['removed','#f85149','\\u2212 removed'],
  ['modified','#58a6ff','~ modified'],
  ['renamed','#d2a8ff','\\u2192 renamed']
];
for(var li=0;li<legendItems.length;li++){{
  var item=legendItems[li];
  if(sCounts[item[0]]){{
    x.fillStyle=item[1];x.globalAlpha=0.7;
    x.fillRect(lx,ly,8,8);
    x.fillStyle='#6a6a8a';x.globalAlpha=0.6;
    x.fillText(item[2]+' ('+sCounts[item[0]]+')',lx+12,ly+7);
    ly+=11;
  }}
}}

// Signature
x.globalAlpha=0.2;
x.font='9px monospace';
x.fillStyle='#6a6a8a';
x.fillText('{escape_html(tag)} — hermes archaeology',8,H-8);
x.globalAlpha=1;

}})();"""

    body = f'<canvas id="c" style="width:100%;height:100vh;display:block;background:#0a0a12"></canvas>'
    css = "body{margin:0;overflow:hidden;background:#0a0a12;display:flex;align-items:center;justify-content:center}"

    return html_wrap(
        f"Signal Bars — {tag}",
        body, css=css, js=js,
        meta={"artifact-type": "signal_bars", "release-tag": tag},
    ), meta
