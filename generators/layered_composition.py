"""
Dense digital collage generator — overlapping panels of code text, color blocks,
directory listings, data fragments, and grid structures. Inspired by Kim Asendorf,
JODI, and 0100101110101101.org. Every piece is data-driven from the release.

Approach: Canvas 2D API (fillRect + fillText), NOT imageData.
Fast, reliable, and visually dense.
"""

import math
import random
import hashlib
import json
from collections import defaultdict
from .artifact_base import html_wrap, escape_html, generate_artifact_meta


PALETTES = [
    {"bg": "#0a0a0a", "fg": "#e0e0e0", "accent": ["#ff3333", "#33cc33", "#3366ff", "#ffcc00", "#ff6600", "#00cccc"]},
    {"bg": "#f0ede4", "fg": "#111111", "accent": ["#e63946", "#2a9d8f", "#264653", "#f4a261", "#457b9d", "#1d3557"]},
    {"bg": "#0d1117", "fg": "#c9d1d9", "accent": ["#58a6ff", "#3fb950", "#f78166", "#d2a8ff", "#ffa657", "#79c0ff"]},
    {"bg": "#111111", "fg": "#00ff41", "accent": ["#00ff41", "#00cc33", "#33ff66", "#00aa22", "#66ff88", "#008800"]},
    {"bg": "#fafafa", "fg": "#1a1a1a", "accent": ["#ff0000", "#0000ff", "#000000", "#00aa00", "#ff6600", "#cc00cc"]},
    {"bg": "#1a1a2e", "fg": "#e0e0e0", "accent": ["#e94560", "#0f3460", "#53a8b6", "#f5e6ca", "#ff6b6b", "#79c2d0"]},
    {"bg": "#0b0c10", "fg": "#66fcf1", "accent": ["#66fcf1", "#45a29e", "#c5c6c7", "#1f2833", "#66fcf1", "#45a29e"]},
    {"bg": "#2b2d42", "fg": "#edf2f4", "accent": ["#ef233c", "#d90429", "#ffb703", "#8d99ae", "#edf2f4", "#fb8500"]},
    {"bg": "#0a0a12", "fg": "#d0d0d0", "accent": ["#ff3366", "#33ccff", "#ffcc33", "#66ff66", "#ff66cc", "#6633ff"]},
    {"bg": "#f5f5dc", "fg": "#222222", "accent": ["#8b0000", "#006400", "#00008b", "#8b8b00", "#8b4513", "#2f4f4f"]},
    {"bg": "#1c1c1c", "fg": "#e8e8e8", "accent": ["#ff6b6b", "#4ecdc4", "#45b7d1", "#f7dc6f", "#bb8fce", "#82e0aa"]},
]


def generate(release, mode=None):
    meta = generate_artifact_meta(release, "layered_composition")
    tag = release["tag"]
    files = release.get("compare", {}).get("files", [])
    commits = release.get("commits_sample", [])
    stats = release.get("stats", {})

    seed_int = int(hashlib.md5(tag.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed_int)

    palette = PALETTES[seed_int % len(PALETTES)]
    if mode is None:
        mode = seed_int % 4

    W, H = 1200, 900

    dir_groups = _group_by_directory(files)
    max_churn = max((f["changes"] for f in files), default=1) or 1

    file_data = []
    for f in files[:300]:
        file_data.append({
            "n": f["filename"],
            "a": f["additions"],
            "d": f["deletions"],
            "c": f["changes"],
            "t": round(f["changes"] / max_churn, 3),
        })
    if not file_data:
        for c in commits[:50]:
            file_data.append({
                "n": c["sha"][:12],
                "a": 10, "d": 5, "c": 15, "t": 0.5,
            })

    dir_data = []
    for d, group in list(dir_groups.items())[:20]:
        dir_data.append({"name": d, "count": len(group), "churn": sum(f["changes"] for f in group)})

    commit_msgs = [c["message"][:80].replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"') for c in commits[:30]]

    grid = _make_grid(rng, W, H, mode)

    text_blocks = _make_text_content(rng, tag, file_data, dir_data, commit_msgs, stats)

    js = _build_js(W, H, palette, file_data, dir_data, commit_msgs, grid, text_blocks, seed_int, mode, tag)

    body = f'<canvas id="c" style="width:100%;height:100vh;display:block;background:{palette["bg"]}"></canvas>'
    css = f"body{{margin:0;overflow:hidden;background:{palette['bg']};display:flex;align-items:center;justify-content:center}}"

    return html_wrap(
        f"Hermes Archaeology — {tag}",
        body, css=css, js=js,
        meta={"artifact-type": "layered_composition", "release-tag": tag},
    ), meta


def _group_by_directory(files):
    groups = defaultdict(list)
    for f in files:
        parts = f["filename"].split("/")
        groups[parts[0] if len(parts) > 1 else "root"].append(f)
    return dict(groups)


def _make_grid(rng, W, H, mode):
    return [[round(r[0]), round(r[1]), round(r[2]), round(r[3])]
            for r in _subdiv(rng, 0, 0, W, H, 0, rng.randint(4, 6))]


def _subdiv(rng, x, y, w, h, d, md):
    if d >= md or w < 30 or h < 25:
        return [(x, y, w, h)]
    if rng.random() < 0.12 and d > 1:
        return [(x, y, w, h)]
    if rng.random() < 0.55:
        s = rng.uniform(0.25, 0.75)
        return _subdiv(rng, x, y, w * s, h, d + 1, md) + _subdiv(rng, x + w * s, y, w * (1 - s), h, d + 1, md)
    else:
        s = rng.uniform(0.25, 0.75)
        return _subdiv(rng, x, y, w, h * s, d + 1, md) + _subdiv(rng, x, y + h * s, w, h * (1 - s), d + 1, md)


def _make_text_content(rng, tag, file_data, dir_data, commit_msgs, stats):
    blocks = []

    filenames = [f["n"] for f in file_data[:80]]
    if filenames:
        lines = []
        for fn in filenames:
            size = rng.randint(100, 9999)
            lines.append(f"{fn:50s} {size:>6d}")
        blocks.append({"type": "index", "lines": lines})

    if commit_msgs:
        blocks.append({"type": "log", "lines": [f"  {m}" for m in commit_msgs[:20]]})

    code_lines = []
    for f in file_data[:30]:
        ext = f["n"].rsplit(".", 1)[-1] if "." in f["n"] else "txt"
        if ext in ("py", "ts", "js", "rs"):
            code_lines.append(f"+ {f['n']}  (+{f['a']}/-{f['d']})")
    if code_lines:
        blocks.append({"type": "diff", "lines": code_lines})

    stat_lines = []
    for k, v in stats.items():
        if v:
            stat_lines.append(f"{k}: {v}")
    for dd in dir_data[:10]:
        stat_lines.append(f"{dd['name']}/  {dd['count']} files  {dd['churn']} changes")
    if stat_lines:
        blocks.append({"type": "stats", "lines": stat_lines})

    return blocks


def _build_js(W, H, palette, file_data, dir_data, commit_msgs, grid, text_blocks, seed, mode, tag):
    all_text = json.dumps(text_blocks)
    return f"""(function(){{
var W={W},H={H},seed={seed};
var c=document.getElementById('c');
c.width=W;c.height=H;
var x=c.getContext('2d');
var bg='{palette["bg"]}',fg='{palette["fg"]}';
var acc={json.dumps(palette['accent'])};
var files={json.dumps(file_data)};
var dirs={json.dumps(dir_data)};
var grid={json.dumps(grid)};
var tblocks={all_text};
var commits={json.dumps(commit_msgs)};

var _s=seed;
function R(){{_s=(_s*16807)%2147483647;return(_s&0x7fffffff)/2147483647;}}

// Fill bg
x.fillStyle=bg;
x.fillRect(0,0,W,H);

// LAYER 1: Dense colored block grid
for(var i=0;i<grid.length;i++){{
  var g=grid[i],gx=g[0],gy=g[1],gw=g[2],gh=g[3];
  var fi=i%Math.max(files.length,1);
  var f=files.length?files[fi]:{{t:0.5,a:10,d:5,c:15}};
  var col=acc[i%acc.length];
  var t=f.t;

  // Cell fill: dense small blocks
  var bs=Math.max(2,Math.round(3+R()*5));
  for(var by=gy;by<gy+gh;by+=bs){{
    for(var bx=gx;bx<gx+gw;bx+=bs){{
      var pick=R();
      if(pick<t*0.7){{
        x.fillStyle=col;
        x.globalAlpha=0.4+R()*0.6;
      }} else if(pick<t*0.7+0.15){{
        x.fillStyle=acc[Math.floor(R()*acc.length)];
        x.globalAlpha=0.2+R()*0.5;
      }} else {{
        x.fillStyle=bg;
        x.globalAlpha=0.6+R()*0.4;
      }}
      x.fillRect(Math.round(bx),Math.round(by),bs,bs);
    }}
  }}
}}
x.globalAlpha=1;

// LAYER 2: Grid borders
x.strokeStyle=fg;
x.globalAlpha=0.15;
x.lineWidth=1;
for(var i=0;i<grid.length;i++){{
  var g=grid[i];
  x.strokeRect(g[0],g[1],g[2],g[3]);
}}
x.globalAlpha=1;

// LAYER 3: Horizontal color bands (pixel sort effect)
var nBands=3+Math.round(R()*5);
for(var b=0;b<nBands;b++){{
  var by=Math.round(R()*H*0.9);
  var bh=Math.max(4,Math.round(R()*30));
  var col1=acc[Math.floor(R()*acc.length)];
  var col2=acc[Math.floor(R()*acc.length)];
  var startX=Math.round(R()*W*0.3);
  var endX=Math.round(startX+W*0.3+R()*W*0.4);

  for(var bx=startX;bx<endX;bx+=2){{
    var t2=(bx-startX)/(endX-startX);
    x.fillStyle=t2<0.5?col1:col2;
    x.globalAlpha=0.3+R()*0.4;
    x.fillRect(bx,by,2,bh);
  }}
}}
x.globalAlpha=1;

// LAYER 4: Overlay panels with text content
var panels=[];
for(var ti=0;ti<tblocks.length;ti++){{
  var tb=tblocks[ti];
  var px=Math.round(R()*W*0.5);
  var py=Math.round(R()*H*0.5);
  var pw=Math.round(200+R()*500);
  var ph=Math.round(150+R()*400);
  panels.push({{x:px,y:py,w:pw,h:ph,tb:tb}});
}}

// Draw panels
for(var pi=0;pi<panels.length;pi++){{
  var p=panels[pi];
  var panelBg=R()<0.5?bg:acc[Math.floor(R()*acc.length)];
  x.fillStyle=panelBg;
  x.globalAlpha=0.7+R()*0.3;
  x.fillRect(p.x,p.y,p.w,p.h);

  // Panel border
  x.strokeStyle=fg;
  x.globalAlpha=0.3;
  x.lineWidth=1;
  x.strokeRect(p.x,p.y,p.w,p.h);

  // Text content
  x.globalAlpha=0.7+R()*0.3;
  x.fillStyle=fg;
  var fontSize=Math.round(8+R()*4);
  x.font=fontSize+'px monospace';
  var lines=p.tb.lines||[];
  var ly=p.y+fontSize+4;
  for(var li=0;li<lines.length&&ly<p.y+p.h-4;li++){{
    var line=lines[li];
    if(line.length>Math.floor(p.w/(fontSize*0.6))){{
      line=line.substring(0,Math.floor(p.w/(fontSize*0.6)));
    }}
    x.fillText(line,p.x+6,ly);
    ly+=fontSize+2;
  }}
}}
x.globalAlpha=1;

// LAYER 5: Large accent rectangles (bold color blocks like the reference)
var nBlocks=2+Math.round(R()*4);
for(var i=0;i<nBlocks;i++){{
  var bx2=Math.round(R()*W*0.7);
  var by2=Math.round(R()*H*0.7);
  var bw2=Math.round(80+R()*300);
  var bh2=Math.round(60+R()*200);
  x.fillStyle=acc[Math.floor(R()*acc.length)];
  x.globalAlpha=0.15+R()*0.35;
  x.fillRect(bx2,by2,bw2,bh2);
}}
x.globalAlpha=1;

// LAYER 6: Scattered commit text at various sizes
for(var i=0;i<commits.length;i++){{
  var tx=R()*W*0.85;
  var ty=20+R()*H*0.9;
  var ts=Math.round(7+R()*14);
  x.font=ts+'px monospace';
  x.fillStyle=R()<0.4?fg:acc[Math.floor(R()*acc.length)];
  x.globalAlpha=0.08+R()*0.25;
  x.fillText(commits[i],tx,ty);
}}
x.globalAlpha=1;

// LAYER 7: Filename waterfall (dense vertical text column)
var colX=Math.round(R()*W*0.3);
var colW=Math.round(200+R()*300);
x.font='8px monospace';
x.fillStyle=fg;
x.globalAlpha=0.15;
x.fillRect(colX,0,colW,H);
x.globalAlpha=0.6;
var fy=10;
for(var i=0;i<files.length&&fy<H;i++){{
  var fn=files[i].n;
  if(fn.length>Math.floor(colW/5))fn=fn.substring(0,Math.floor(colW/5));
  x.fillStyle=files[i].t>0.5?acc[i%acc.length]:fg;
  x.globalAlpha=0.3+files[i].t*0.5;
  x.fillText(fn,colX+4,fy);
  fy+=10;
}}
x.globalAlpha=1;

// LAYER 8: Directory labels (large, semi-transparent)
for(var i=0;i<dirs.length&&i<8;i++){{
  var d=dirs[i];
  var dx=Math.round(R()*W*0.7);
  var dy=Math.round(R()*H*0.8)+40;
  var ds=Math.round(18+R()*30);
  x.font='bold '+ds+'px monospace';
  x.fillStyle=acc[i%acc.length];
  x.globalAlpha=0.08+R()*0.12;
  x.fillText(d.name+'/',dx,dy);
}}
x.globalAlpha=1;

// LAYER 9: Pixel noise strips (glitch effect)
var nStrips=5+Math.round(R()*10);
for(var i=0;i<nStrips;i++){{
  var sy=Math.round(R()*H);
  var sh=Math.max(1,Math.round(R()*4));
  var sx=Math.round(R()*W*0.5);
  var sw=Math.round(W*0.2+R()*W*0.5);
  var sc=acc[Math.floor(R()*acc.length)];
  x.fillStyle=sc;
  x.globalAlpha=0.3+R()*0.5;
  x.fillRect(sx,sy,sw,sh);
}}
x.globalAlpha=1;

// LAYER 10: Data stat overlay
x.font='10px monospace';
x.fillStyle=fg;
x.globalAlpha=0.35;
var sx2=W-200;
var sy2=20;
var statText=['{escape_html(tag)}'];
for(var i=0;i<dirs.length&&i<6;i++){{
  statText.push(dirs[i].name+'/  '+dirs[i].count+' files');
}}
for(var i=0;i<statText.length;i++){{
  x.fillText(statText[i],sx2,sy2+i*14);
}}

// Signature
x.globalAlpha=0.3;
x.font='9px monospace';
x.fillText('{escape_html(tag)} — hermes archaeology',8,H-8);
x.globalAlpha=1;

}})();"""
