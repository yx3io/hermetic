"""
Diff-semantic treemap generator.

Visual mapping:
  + added    -> solid filled blocks (accent color)
  - removed  -> negative space / cut-out (background-color block with subtle border)
  ~ modified -> hatched/striped blocks
  -> renamed -> connected block pair with thin arrow

Every rectangle's size is proportional to its total churn (additions + deletions).
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

STATUS_ADDED = "added"
STATUS_REMOVED = "removed"
STATUS_MODIFIED = "modified"
STATUS_RENAMED = "renamed"


def generate(release, mode=None):
    meta = generate_artifact_meta(release, "diff_treemap")
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

    max_churn = max((f.get("changes", 1) for f in files), default=1) or 1
    file_data = []
    for f in files[:200]:
        entry = {
            "n": f["filename"],
            "s": f.get("status", STATUS_MODIFIED),
            "a": f.get("additions", 0),
            "d": f.get("deletions", 0),
            "c": max(f.get("changes", 1), 1),
            "t": round(f.get("changes", 1) / max_churn, 3),
        }
        if f.get("status") == STATUS_RENAMED and f.get("previous_filename"):
            entry["pn"] = f["previous_filename"]
        file_data.append(entry)

    if not file_data:
        for c in commits[:30]:
            file_data.append({
                "n": c.get("sha", "")[:12],
                "s": STATUS_MODIFIED, "a": 10, "d": 5, "c": 15, "t": 0.5,
            })

    status_counts = defaultdict(int)
    for f in file_data:
        status_counts[f["s"]] += 1

    dir_groups = _group_by_directory(files)
    dir_data = []
    for d, group in list(dir_groups.items())[:20]:
        dir_data.append({"name": d, "count": len(group), "churn": sum(f.get("changes", 0) for f in group)})

    commit_msgs = [c.get("message", "")[:80].replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"') for c in commits[:30]]

    grid = _make_grid(rng, W, H, mode)

    js = _build_js(W, H, palette, file_data, dir_data, commit_msgs, grid,
                   seed_int, mode, tag, dict(status_counts))

    body = f'<canvas id="c" style="width:100%;height:100vh;display:block;background:{palette["bg"]}"></canvas>'
    css = f"body{{margin:0;overflow:hidden;background:{palette['bg']};display:flex;align-items:center;justify-content:center}}"

    return html_wrap(
        f"Hermes Archaeology — {tag}",
        body, css=css, js=js,
        meta={"artifact-type": "diff_treemap", "release-tag": tag},
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


def _build_js(W, H, palette, file_data, dir_data, commit_msgs, grid, seed, mode, tag, status_counts):
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
var commits={json.dumps(commit_msgs)};
var sCounts={json.dumps(status_counts)};

var _s=seed;
function R(){{_s=(_s*16807)%2147483647;return(_s&0x7fffffff)/2147483647;}}

function drawHatch(cx,cy,cw,ch,col,spacing){{
  x.save();
  x.beginPath();
  x.rect(cx,cy,cw,ch);
  x.clip();
  x.strokeStyle=col;
  x.lineWidth=1;
  x.globalAlpha=0.6;
  for(var i=-ch;i<cw+ch;i+=spacing){{
    x.beginPath();
    x.moveTo(cx+i,cy);
    x.lineTo(cx+i-ch,cy+ch);
    x.stroke();
  }}
  x.restore();
}}

function drawCutout(cx,cy,cw,ch){{
  x.fillStyle=bg;
  x.globalAlpha=0.95;
  x.fillRect(cx,cy,cw,ch);
  x.globalAlpha=0.4;
  x.strokeStyle=fg;
  x.lineWidth=1;
  x.setLineDash([3,3]);
  x.strokeRect(cx+0.5,cy+0.5,cw-1,ch-1);
  x.setLineDash([]);
  x.globalAlpha=1;
}}

function drawArrow(x1,y1,x2,y2,col){{
  x.save();
  x.strokeStyle=col;
  x.fillStyle=col;
  x.lineWidth=1;
  x.globalAlpha=0.5;
  x.beginPath();
  x.moveTo(x1,y1);
  x.lineTo(x2,y2);
  x.stroke();
  var a=Math.atan2(y2-y1,x2-x1);
  var hs=5;
  x.beginPath();
  x.moveTo(x2,y2);
  x.lineTo(x2-hs*Math.cos(a-0.4),y2-hs*Math.sin(a-0.4));
  x.lineTo(x2-hs*Math.cos(a+0.4),y2-hs*Math.sin(a+0.4));
  x.closePath();
  x.fill();
  x.restore();
}}

x.fillStyle=bg;
x.fillRect(0,0,W,H);

// CHURN MAP
var totalChurn=0;
for(var i=0;i<files.length;i++)totalChurn+=files[i].c;
if(!totalChurn)totalChurn=1;

var mapX=40,mapY=40,mapW=W-80,mapH=H*0.55;
var sortedFiles=files.slice().sort(function(a,b){{return b.c-a.c;}});
var rects=[];

var cx=mapX,cy=mapY;
var remaining=totalChurn;
var fi=0;
var rowH=0;

while(fi<sortedFiles.length&&cy<mapY+mapH){{
  var rowFiles=[];
  var rowChurn=0;
  var targetRowChurn=remaining/(Math.ceil((mapY+mapH-cy)/40)||1);
  targetRowChurn=Math.max(targetRowChurn,sortedFiles[fi].c);

  while(fi<sortedFiles.length&&(rowChurn<targetRowChurn||rowFiles.length===0)){{
    rowFiles.push(sortedFiles[fi]);
    rowChurn+=sortedFiles[fi].c;
    fi++;
  }}
  remaining-=rowChurn;

  rowH=Math.max(12,Math.min(60,Math.round((rowChurn/totalChurn)*mapH*2)));
  if(cy+rowH>mapY+mapH)rowH=mapY+mapH-cy;

  var rx=mapX;
  for(var ri=0;ri<rowFiles.length;ri++){{
    var rf=rowFiles[ri];
    var rw=Math.max(4,Math.round((rf.c/rowChurn)*mapW));
    if(ri===rowFiles.length-1)rw=mapX+mapW-rx;
    if(rw<1)continue;

    rects.push({{x:rx,y:cy,w:rw,h:rowH,f:rf}});
    rx+=rw;
  }}
  cy+=rowH;
}}

var renameArrows=[];
for(var i=0;i<rects.length;i++){{
  var r=rects[i],f=r.f;
  var col=acc[i%acc.length];

  if(f.s==='{STATUS_ADDED}'){{
    x.fillStyle=col;
    x.globalAlpha=0.5+f.t*0.4;
    x.fillRect(r.x,r.y,r.w,r.h);
  }} else if(f.s==='{STATUS_REMOVED}'){{
    drawCutout(r.x,r.y,r.w,r.h);
  }} else if(f.s==='{STATUS_RENAMED}'){{
    x.fillStyle=col;
    x.globalAlpha=0.35+f.t*0.3;
    x.fillRect(r.x,r.y,r.w,r.h);
    if(f.pn)renameArrows.push({{x:r.x,y:r.y,w:r.w,h:r.h,f:f,col:col}});
  }} else {{
    x.fillStyle=col;
    x.globalAlpha=0.15;
    x.fillRect(r.x,r.y,r.w,r.h);
    x.globalAlpha=1;
    drawHatch(r.x,r.y,r.w,r.h,col,Math.max(3,Math.round(4+R()*4)));
  }}
}}
x.globalAlpha=1;

x.strokeStyle=fg;
x.globalAlpha=0.1;
x.lineWidth=1;
for(var i=0;i<rects.length;i++){{
  var r=rects[i];
  x.strokeRect(r.x,r.y,r.w,r.h);
}}
x.globalAlpha=1;

var arrowCount=Math.min(renameArrows.length,8);
for(var i=0;i<arrowCount;i++){{
  var ra=renameArrows[i];
  var fromX=ra.x,fromY=ra.y+ra.h/2;
  var toX=ra.x+ra.w,toY=ra.y+ra.h/2;
  drawArrow(fromX-15,fromY,toX,toY,ra.col);
  if(ra.f.pn){{
    x.font='7px monospace';
    x.fillStyle=fg;
    x.globalAlpha=0.35;
    var pnShort=ra.f.pn.length>25?ra.f.pn.substring(ra.f.pn.length-25):ra.f.pn;
    x.fillText(pnShort,Math.max(0,ra.x-15),ra.y-2);
    x.globalAlpha=1;
  }}
}}
if(renameArrows.length>8){{
  x.font='8px monospace';
  x.fillStyle=fg;
  x.globalAlpha=0.3;
  x.fillText('+'+(renameArrows.length-8)+' renames (collapsed)',mapX,mapY+mapH+14);
  x.globalAlpha=1;
}}

// Background grid texture
x.strokeStyle=fg;
x.globalAlpha=0.04;
x.lineWidth=1;
for(var gx=0;gx<W;gx+=30){{x.beginPath();x.moveTo(gx,0);x.lineTo(gx,H);x.stroke();}}
for(var gy=0;gy<H;gy+=30){{x.beginPath();x.moveTo(0,gy);x.lineTo(W,gy);x.stroke();}}
x.globalAlpha=1;

// Horizontal color bands
var nBands=2+Math.round(R()*4);
for(var b=0;b<nBands;b++){{
  var by=Math.round(mapY+mapH+20+R()*(H-mapY-mapH-60));
  var bh=Math.max(3,Math.round(R()*15));
  var col1=acc[Math.floor(R()*acc.length)];
  var startX=Math.round(R()*W*0.3);
  var endX=Math.round(startX+W*0.3+R()*W*0.4);
  x.fillStyle=col1;
  for(var bx=startX;bx<endX;bx+=2){{
    x.globalAlpha=0.15+R()*0.25;
    x.fillRect(bx,by,2,bh);
  }}
}}
x.globalAlpha=1;

// Commit text scatter
var textY=mapY+mapH+30;
for(var i=0;i<commits.length&&i<20;i++){{
  var tx=40+R()*(W-100);
  var ty=textY+R()*(H-textY-40);
  var ts=Math.round(7+R()*8);
  x.font=ts+'px monospace';
  x.fillStyle=R()<0.3?acc[Math.floor(R()*acc.length)]:fg;
  x.globalAlpha=0.06+R()*0.15;
  x.fillText(commits[i],tx,ty);
}}
x.globalAlpha=1;

// Directory labels
for(var i=0;i<dirs.length&&i<6;i++){{
  var d=dirs[i];
  var dx=Math.round(R()*W*0.6)+40;
  var dy=Math.round(mapY+mapH+40+R()*(H-mapY-mapH-80));
  var ds=Math.round(16+R()*24);
  x.font='bold '+ds+'px monospace';
  x.fillStyle=acc[i%acc.length];
  x.globalAlpha=0.06+R()*0.08;
  x.fillText(d.name+'/',dx,dy);
}}
x.globalAlpha=1;

// Filename labels on blocks
x.font='7px monospace';
for(var i=0;i<rects.length&&i<60;i++){{
  var r=rects[i],f=r.f;
  if(r.w>30&&r.h>10){{
    var fnShort=f.n.split('/').pop();
    if(fnShort.length>Math.floor(r.w/4.5))fnShort=fnShort.substring(0,Math.floor(r.w/4.5));
    x.fillStyle=f.s==='{STATUS_REMOVED}'?fg:bg;
    x.globalAlpha=f.s==='{STATUS_REMOVED}'?0.3:0.6;
    x.fillText(fnShort,r.x+3,r.y+r.h-3);
  }}
}}
x.globalAlpha=1;

// Legend
var lx=W-130,ly=H-60;
x.fillStyle=bg;x.globalAlpha=0.7;x.fillRect(lx-8,ly-12,128,52);
x.globalAlpha=1;
x.font='8px monospace';
x.fillStyle=fg;x.globalAlpha=0.5;

if(sCounts.added){{
  x.fillStyle=acc[1];x.globalAlpha=0.7;
  x.fillRect(lx,ly,8,8);
  x.fillStyle=fg;x.globalAlpha=0.5;
  x.fillText('+ added ('+sCounts.added+')',lx+12,ly+7);
  ly+=12;
}}
if(sCounts.removed){{
  x.fillStyle=bg;x.fillRect(lx,ly,8,8);
  x.strokeStyle=fg;x.globalAlpha=0.4;x.setLineDash([2,2]);x.strokeRect(lx,ly,8,8);x.setLineDash([]);
  x.fillStyle=fg;x.globalAlpha=0.5;
  x.fillText('\\u2212 removed ('+sCounts.removed+')',lx+12,ly+7);
  ly+=12;
}}
if(sCounts.modified){{
  drawHatch(lx,ly,8,8,acc[0],3);
  x.fillStyle=fg;x.globalAlpha=0.5;
  x.fillText('~ modified ('+sCounts.modified+')',lx+12,ly+7);
  ly+=12;
}}
if(sCounts.renamed){{
  drawArrow(lx,ly+4,lx+8,ly+4,acc[3]||fg);
  x.fillStyle=fg;x.globalAlpha=0.5;
  x.fillText('\\u2192 renamed ('+sCounts.renamed+')',lx+12,ly+7);
}}

x.globalAlpha=0.25;
x.font='9px monospace';
x.fillStyle=fg;
x.fillText('{escape_html(tag)} \\u2014 hermes archaeology',8,H-8);
x.globalAlpha=1;

}})();"""
