"""
p5.js artwork generator — 10 distinct visual modes that produce
genuinely different artworks. Each mode is a self-contained draw
routine, not just different layer picks from the same pool.

Modes:
  0  Dense pixel collage — overlapping colored rectangles, scanlines, text fragments
  1  Concrete typography — commit messages at huge scales, sparse
  2  Blueprint/schematic — thin lines, brackets, annotations, muted
  3  Glitch displacement — horizontal RGB splits, noise bands
  4  Minimal geometric — sparse marks on empty canvas
  5  Data bars — horizontal/vertical bars sized by file churn
  6  Woven textile — interlocking grid patterns
  7  Terminal dump — green-on-black, file listings, cursor blink
  8  Noise landscape — perlin noise terrain, organic flow
  9  Stacked fragments — layered translucent panels with mixed content
"""

import hashlib
import json
import random
from collections import defaultdict
from .artifact_base import generate_artifact_meta
from .p5_new_styles import (
    _build_ai_detection,
    _build_scattered_text,
    _build_trial3_type,
    _build_contour_shapes,
    _build_geo_data,
)

P5_CDN = "https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js"

NUM_MODES = 15

PALETTES = {
    0: {"bg": "#0a0a0a", "fg": "#e8e8e8", "acc": ["#ff3333", "#33cc33", "#3366ff", "#ffcc00", "#ff66cc"]},
    1: {"bg": "#f5f0e8", "fg": "#111111", "acc": ["#000000", "#cc0000", "#0044aa", "#888888"]},
    2: {"bg": "#0d1a2a", "fg": "#8899bb", "acc": ["#446688", "#667799", "#4488aa", "#99aabb"]},
    3: {"bg": "#000000", "fg": "#ffffff", "acc": ["#ff0000", "#00ff00", "#0000ff", "#ff00ff"]},
    4: {"bg": "#fafaf8", "fg": "#222222", "acc": ["#222222", "#cc3333", "#3366cc"]},
    5: {"bg": "#1a1a1a", "fg": "#cccccc", "acc": ["#e63946", "#457b9d", "#2a9d8f", "#f4a261", "#e9c46a"]},
    6: {"bg": "#e8e4de", "fg": "#2a2a2a", "acc": ["#c44536", "#283d3b", "#772e25", "#edddd4"]},
    7: {"bg": "#0a0a0a", "fg": "#00ff41", "acc": ["#00ff41", "#00cc33", "#33ff66", "#00aa22"]},
    8: {"bg": "#1c1c2e", "fg": "#d4c5a9", "acc": ["#6b4c3b", "#8b7355", "#a0522d", "#deb887"]},
    9: {"bg": "#111111", "fg": "#e0e0e0", "acc": ["#ff6b6b", "#4ecdc4", "#45b7d1", "#f7dc6f", "#a78bfa"]},
    10: {"bg": "#000000", "fg": "#64f050", "acc": ["#64f050", "#ffc800", "#f05082", "#3264ff"]},
    11: {"bg": "#ffffff", "fg": "#111111", "acc": ["#111111", "#333333"]},
    12: {"bg": "#1a1a1a", "fg": "#e6e6e1", "acc": ["#3232dc", "#64f050", "#f05082", "#ffc800"]},
    13: {"bg": "#fcfaf5", "fg": "#1e1e1e", "acc": ["#1e1e1e", "#666666"]},
    14: {"bg": "#f8f8f4", "fg": "#3232dc", "acc": ["#3232dc", "#5050b4", "#8080ff"]},
}

EXTRA_PALETTES = [
    {"bg": "#2b2d42", "fg": "#edf2f4", "acc": ["#ef233c", "#d90429", "#ffb703", "#8d99ae"]},
    {"bg": "#f5f5dc", "fg": "#222222", "acc": ["#8b0000", "#006400", "#00008b", "#8b8b00"]},
    {"bg": "#0b0c10", "fg": "#66fcf1", "acc": ["#66fcf1", "#45a29e", "#c5c6c7", "#1f2833"]},
    {"bg": "#1a1a2e", "fg": "#e0e0e0", "acc": ["#e94560", "#0f3460", "#53a8b6", "#f5e6ca"]},
    {"bg": "#fafafa", "fg": "#1a1a1a", "acc": ["#ff0000", "#0000ff", "#000000", "#00aa00"]},
]


def _group_dirs(files):
    groups = defaultdict(list)
    for f in files:
        parts = f["filename"].split("/")
        groups[parts[0] if len(parts) > 1 else "root"].append(f)
    return dict(groups)


def _prep_data(release):
    files = release.get("compare", {}).get("files", [])
    commits = release.get("commits_sample", [])
    tag = release["tag"]
    max_churn = max((f.get("changes", 0) for f in files), default=1) or 1

    file_data = []
    for f in files[:200]:
        file_data.append({
            "n": f["filename"],
            "a": f.get("additions", 0),
            "d": f.get("deletions", 0),
            "c": f.get("changes", 0),
            "t": round(f.get("changes", 0) / max_churn, 3),
        })

    dir_groups = _group_dirs(files)
    dir_data = []
    for d, group in sorted(dir_groups.items(), key=lambda x: -sum(f.get("changes", 0) for f in x[1]))[:15]:
        dir_data.append({"name": d, "count": len(group), "churn": sum(f.get("changes", 0) for f in group)})

    authors = list({c.get("author", "unknown") for c in commits})

    commit_msgs = []
    for c in commits[:30]:
        msg = c.get("message", "")[:80]
        msg = msg.replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"').replace("\n", " ").replace("\r", "")
        commit_msgs.append(msg)

    filenames_short = []
    for f in files[:60]:
        fn = f["filename"].split("/")[-1]
        filenames_short.append(fn[:20])

    return {
        "files": file_data,
        "dirs": dir_data,
        "commits": commit_msgs,
        "authors": authors,
        "filenames": filenames_short,
        "tag": tag,
        "total_files": len(files),
        "total_adds": sum(f.get("additions", 0) for f in files),
        "total_dels": sum(f.get("deletions", 0) for f in files),
        "is_release": release.get("is_release", False),
    }


def generate(release, mode=None):
    meta = generate_artifact_meta(release, "p5_composition")
    tag = release["tag"]
    seed_int = int(hashlib.md5(tag.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed_int)

    data = _prep_data(release)

    if mode is not None:
        style = mode
    else:
        style = 10 + (seed_int % 5)

    pal = PALETTES[style].copy()
    pal_variant = (seed_int >> 8) % len(EXTRA_PALETTES)
    if (seed_int >> 12) % 3 == 0:
        pal = EXTRA_PALETTES[pal_variant].copy()

    js_data = json.dumps(data)
    js_pal = json.dumps(pal)

    sketch_fn = STYLE_BUILDERS[style]
    sketch = sketch_fn(seed_int, js_data, js_pal, rng)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>hermes — {tag}</title>
<script src="{P5_CDN}"></script>
<style>
*,*::before,*::after{{margin:0;padding:0;box-sizing:border-box}}
body{{margin:0;overflow:hidden;background:{pal['bg']};min-height:100vh}}
canvas{{display:block}}
</style>
</head>
<body>
<script>
{sketch}
</script>
</body>
</html>"""

    return html, meta


# ═══════════════════════════════════════════════════════════════
#  SHARED HELPERS (embedded in every sketch)
# ═══════════════════════════════════════════════════════════════

SHARED_JS = """
var W=1200,H=900;
function sr(i){{return fract(sin(i*127.1+SEED*311.7)*43758.5453)}}
function fract(x){{return x-floor(x)}}
function pa(i){{return PAL.acc[abs(i)%PAL.acc.length]}}
function fc(c,a){{var _c=color(c);return color(red(_c),green(_c),blue(_c),a)}}
"""


# ═══════════════════════════════════════════════════════════════
#  MODE 0: DENSE PIXEL COLLAGE
# ═══════════════════════════════════════════════════════════════

def _build_collage(seed, js_data, js_pal, rng):
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
{SHARED_JS}
function setup(){{createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(PAL.bg);
  // large color blocks
  var nb=constrain(floor(D.total_files/5)+5,5,30);
  for(var i=0;i<nb;i++){{
    fill(fc(pa(i),20+sr(i*7+1)*50));noStroke();
    var bx=sr(i*7+2)*W,by=sr(i*7+3)*H;
    var bw=50+sr(i*7+4)*400,bh=30+sr(i*7+5)*300;
    rect(bx,by,bw,bh);
  }}
  // scanlines
  stroke(fc(PAL.fg,20));strokeWeight(0.3);
  for(var i=0;i<H;i+=3){{if(sr(i+900)>0.6)line(0,i,W,i)}}
  // file index column
  if(D.files.length>0){{
    var sx=sr(42)*W*0.3+20,sy=30;
    fill(PAL.fg);noStroke();textSize(10);textStyle(BOLD);textAlign(LEFT,TOP);
    text('Index of /'+D.tag+'/',sx,sy);textStyle(NORMAL);textSize(7);
    for(var i=0;i<min(D.files.length,40);i++){{
      var f=D.files[i];var a=map(f.t,0,1,80,255);
      fill(fc(PAL.fg,a));text(f.n.substring(0,45),sx,sy+16+i*11);
      fill(pa(i));textAlign(RIGHT,TOP);text('+'+f.a+'/-'+f.d,sx+380,sy+16+i*11);textAlign(LEFT,TOP);
    }}
  }}
  // glitch bands
  var gb=constrain(floor(D.total_dels/20)+1,1,15);
  for(var i=0;i<gb;i++){{
    var gy=sr(i*5+400)*H,gh=2+sr(i*5+401)*25;
    fill(fc(pa(i),35));noStroke();rect((sr(i*5+402)-0.5)*80,gy,W+80,gh);
    stroke(pa(i));strokeWeight(0.4);line(0,gy+gh/2,W,gy+gh/2);
  }}
  // commit text scattered
  noStroke();
  for(var i=0;i<D.commits.length;i++){{
    var sz=8+sr(i*17+2)*20;fill(fc(PAL.fg,30+sr(i*17+3)*120));
    textSize(sz);text(D.commits[i].substring(0,floor(200/sz)),sr(i*17)*W*0.9,sr(i*17+1)*H*0.9);
  }}
  // geometric marks
  noFill();
  for(var i=0;i<20;i++){{
    stroke(pa(i));strokeWeight(0.5);
    var mx=sr(i*9+600)*W,my=sr(i*9+601)*H,ms=5+sr(i*9+602)*25;
    var t=floor(sr(i*9+603)*4);
    if(t==0)circle(mx,my,ms);else if(t==1){{line(mx-ms/2,my,mx+ms/2,my);line(mx,my-ms/2,mx,my+ms/2)}}
    else if(t==2)rect(mx-ms/2,my-ms/2,ms,ms);else{{line(mx,my-ms/2,mx+4,my-ms/2);line(mx,my-ms/2,mx,my+ms/2);line(mx,my+ms/2,mx+4,my+ms/2)}}
  }}
}}
"""


# ═══════════════════════════════════════════════════════════════
#  MODE 1: CONCRETE TYPOGRAPHY
# ═══════════════════════════════════════════════════════════════

def _build_typographic(seed, js_data, js_pal, rng):
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
{SHARED_JS}
function setup(){{createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(PAL.bg);
  // one or two massive words
  if(D.commits.length>0){{
    fill(fc(PAL.fg,12));noStroke();textSize(140);textAlign(CENTER,CENTER);
    var big=D.commits[0].split(' ')[0]||D.tag;
    text(big.substring(0,8).toUpperCase(),W/2,H*0.35);
    if(D.commits.length>1){{
      textSize(90);fill(fc(pa(0),15));
      text(D.commits[1].split(' ').slice(0,2).join(' ').substring(0,12),W/2,H*0.65);
    }}
  }}
  // medium commit messages at angles
  for(var i=0;i<D.commits.length;i++){{
    push();
    var cx=sr(i*13)*W*0.85+W*0.07,cy=sr(i*13+1)*H*0.85+H*0.07;
    translate(cx,cy);
    var ang=(sr(i*13+2)-0.5)*0.3;rotate(ang);
    var sz=9+sr(i*13+3)*14;
    fill(fc(PAL.fg,50+sr(i*13+4)*150));noStroke();textSize(sz);textAlign(LEFT,TOP);
    text(D.commits[i].substring(0,floor(350/sz)),0,0);
    pop();
  }}
  // diff marks as typographic elements
  fill(fc('#00aa44',60));noStroke();textSize(48);textAlign(LEFT,TOP);
  text('+'+D.total_adds,30,H-120);
  fill(fc('#cc3333',60));
  text('-'+D.total_dels,30,H-65);
  // thin rules
  stroke(fc(PAL.fg,25));strokeWeight(0.3);
  line(25,H-130,W*0.4,H-130);line(25,H-55,W*0.3,H-55);
  // author names stacked vertically right side
  textSize(9);noStroke();fill(fc(PAL.fg,70));textAlign(RIGHT,TOP);
  for(var i=0;i<D.authors.length;i++){{text(D.authors[i],W-30,30+i*16)}}
  // tag label
  fill(fc(PAL.fg,30));textSize(11);textAlign(LEFT,BOTTOM);text(D.tag,30,H-10);
}}
"""


# ═══════════════════════════════════════════════════════════════
#  MODE 2: BLUEPRINT / SCHEMATIC
# ═══════════════════════════════════════════════════════════════

def _build_blueprint(seed, js_data, js_pal, rng):
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
{SHARED_JS}
function setup(){{createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(PAL.bg);
  // grid
  stroke(fc(PAL.fg,8));strokeWeight(0.2);
  for(var x=0;x<W;x+=40)line(x,0,x,H);
  for(var y=0;y<H;y+=40)line(0,y,W,y);
  // network of points for contributors
  var pts=[];var n=max(D.authors.length,4);
  for(var i=0;i<n;i++)pts.push({{x:W*0.15+sr(i*3)*W*0.7,y:H*0.15+sr(i*3+1)*H*0.7}});
  // connections
  stroke(fc(PAL.acc[0],40));strokeWeight(0.4);
  for(var i=0;i<pts.length;i++)for(var j=i+1;j<pts.length;j++){{
    var d=dist(pts[i].x,pts[i].y,pts[j].x,pts[j].y);
    if(d<350){{stroke(fc(PAL.acc[0],map(d,0,350,60,5)));line(pts[i].x,pts[i].y,pts[j].x,pts[j].y)}}
  }}
  // labeled points
  for(var i=0;i<pts.length;i++){{
    noStroke();fill(PAL.acc[min(i,PAL.acc.length-1)]);circle(pts[i].x,pts[i].y,5);
    fill(PAL.fg);textSize(7);textAlign(LEFT,TOP);
    var lbl=i<D.authors.length?D.authors[i]:'node_'+i;
    text(lbl.substring(0,12),pts[i].x+6,pts[i].y-3);
    // bracket
    stroke(fc(PAL.fg,40));strokeWeight(0.3);noFill();
    line(pts[i].x-8,pts[i].y-6,pts[i].x-8,pts[i].y+6);
    line(pts[i].x-8,pts[i].y-6,pts[i].x-5,pts[i].y-6);
    line(pts[i].x-8,pts[i].y+6,pts[i].x-5,pts[i].y+6);
  }}
  // directory blocks as schematic modules
  if(D.dirs.length>0){{
    var totalC=D.dirs.reduce(function(s,d){{return s+d.churn}},0)||1;
    var dx=60,dy=H*0.7;
    for(var i=0;i<min(D.dirs.length,10);i++){{
      var dd=D.dirs[i];var bw=max(40,dd.churn/totalC*(W-120));
      noFill();stroke(fc(PAL.fg,50));strokeWeight(0.4);rect(dx,dy,bw,35);
      fill(fc(PAL.fg,70));noStroke();textSize(7);textAlign(LEFT,TOP);
      text(dd.name+'/ ('+dd.count+')',dx+4,dy+4);
      textSize(5);fill(fc(PAL.acc[1],60));text('churn: '+dd.churn,dx+4,dy+16);
      // connecting line up
      stroke(fc(PAL.fg,15));strokeWeight(0.2);
      line(dx+bw/2,dy,dx+bw/2,dy-40-sr(i+800)*100);
      dx+=bw+8;if(dx>W-60)break;
    }}
  }}
  // FIG label
  fill(fc(PAL.fg,35));noStroke();textSize(9);textAlign(LEFT,BOTTOM);
  text('FIG.'+floor(sr(999)*99+1)+' — '+D.tag,20,H-15);
  textAlign(RIGHT,BOTTOM);text(D.total_files+' files | +'+D.total_adds+' -'+D.total_dels,W-20,H-15);
}}
"""


# ═══════════════════════════════════════════════════════════════
#  MODE 3: GLITCH / DISPLACEMENT
# ═══════════════════════════════════════════════════════════════

def _build_glitch(seed, js_data, js_pal, rng):
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
{SHARED_JS}
function setup(){{createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(PAL.bg);
  // base vertical stripes (RGB channel reference)
  var sw=W/3;
  fill(fc('#ff0000',8));noStroke();rect(0,0,sw,H);
  fill(fc('#00ff00',8));rect(sw,0,sw,H);
  fill(fc('#0000ff',8));rect(sw*2,0,sw,H);
  // displacement bands
  var bands=constrain(D.total_files/3+5,5,40);
  for(var i=0;i<bands;i++){{
    var by=sr(i*5+100)*H,bh=1+sr(i*5+101)*40;
    var ox=(sr(i*5+102)-0.5)*200;
    // red channel
    fill(fc('#ff0000',15+sr(i*5+103)*30));noStroke();
    rect(ox-30,by,W+60,bh);
    // green channel offset
    fill(fc('#00ff00',15+sr(i*5+104)*30));
    rect(ox+15,by+2,W+60,bh*0.7);
    // blue channel offset
    fill(fc('#0000ff',10+sr(i*5+105)*20));
    rect(ox-15,by-1,W+60,bh*0.5);
  }}
  // noise static
  loadPixels();
  for(var i=0;i<pixels.length;i+=4){{
    if(random()<0.03){{
      var v=random()*255;
      pixels[i]=v;pixels[i+1]=v;pixels[i+2]=v;pixels[i+3]=40;
    }}
  }}
  updatePixels();
  // large fragmented text
  if(D.commits.length>0){{
    for(var i=0;i<min(D.commits.length,8);i++){{
      var tx=sr(i*19)*W*0.7,ty=sr(i*19+1)*H*0.85+H*0.05;
      var sz=12+sr(i*19+2)*40;
      var ch=floor(sr(i*19+3)*3);
      if(ch==0)fill(fc('#ff3333',100+sr(i*19+4)*155));
      else if(ch==1)fill(fc('#33ff33',100+sr(i*19+4)*155));
      else fill(fc('#3333ff',100+sr(i*19+4)*155));
      noStroke();textSize(sz);textAlign(LEFT,TOP);
      text(D.commits[i].substring(0,floor(180/sz)),tx,ty);
    }}
  }}
  // horizontal cut lines
  stroke(fc(PAL.fg,60));strokeWeight(1);
  for(var i=0;i<8;i++){{var ly=sr(i+500)*H;line(0,ly,W,ly)}}
  // filename fragments at edges
  fill(fc(PAL.fg,40));textSize(6);noStroke();textAlign(LEFT,TOP);
  for(var i=0;i<min(D.filenames.length,20);i++){{
    text(D.filenames[i],sr(i*3+700)<0.5?5:W-80,sr(i*3+701)*H);
  }}
}}
"""


# ═══════════════════════════════════════════════════════════════
#  MODE 4: MINIMAL GEOMETRIC
# ═══════════════════════════════════════════════════════════════

def _build_minimal(seed, js_data, js_pal, rng):
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
{SHARED_JS}
function setup(){{createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(PAL.bg);
  // one big circle
  noFill();stroke(fc(PAL.fg,15));strokeWeight(0.5);
  var cx=W*0.45+sr(1)*W*0.1,cy=H*0.45+sr(2)*H*0.1;
  var rad=min(W,H)*0.35;
  circle(cx,cy,rad*2);
  // inner circles for each contributor
  for(var i=0;i<max(D.authors.length,2);i++){{
    var a=i*TWO_PI/max(D.authors.length,2)+sr(i+10)*0.3;
    var r=rad*0.3+sr(i+20)*rad*0.5;
    var px=cx+cos(a)*r,py=cy+sin(a)*r;
    stroke(fc(pa(i),40));strokeWeight(0.4);
    circle(px,py,8+sr(i+30)*20);
    // thin line to center
    stroke(fc(PAL.fg,10));strokeWeight(0.2);line(cx,cy,px,py);
  }}
  // sparse crosses for files
  var nc=min(D.total_files,15);
  for(var i=0;i<nc;i++){{
    var mx=sr(i*9+100)*W,my=sr(i*9+101)*H;
    var ms=3+sr(i*9+102)*8;
    stroke(fc(PAL.fg,20+sr(i*9+103)*40));strokeWeight(0.3);
    line(mx-ms,my,mx+ms,my);line(mx,my-ms,mx,my+ms);
  }}
  // tag at bottom
  fill(fc(PAL.fg,30));noStroke();textSize(9);textAlign(CENTER,BOTTOM);
  text(D.tag,W/2,H-25);
  // total changes
  textSize(7);fill(fc(PAL.fg,20));
  text(D.total_files+' files',W/2,H-12);
  // single accent dot
  fill(pa(0));noStroke();circle(W/2,H/2,3);
}}
"""


# ═══════════════════════════════════════════════════════════════
#  MODE 5: DATA BARS
# ═══════════════════════════════════════════════════════════════

def _build_bars(seed, js_data, js_pal, rng):
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
{SHARED_JS}
function setup(){{createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(PAL.bg);
  var vertical=sr(50)>0.5;
  if(D.files.length===0){{
    fill(fc(PAL.fg,20));noStroke();textSize(14);textAlign(CENTER,CENTER);
    text('no data',W/2,H/2);return;
  }}
  var maxC=D.files.reduce(function(m,f){{return max(m,f.c)}},1)||1;
  var n=min(D.files.length,80);
  var gap=1;
  if(vertical){{
    var bw=(W-40)/n-gap;
    for(var i=0;i<n;i++){{
      var f=D.files[i];
      var h1=f.a/maxC*(H*0.45);var h2=f.d/maxC*(H*0.45);
      var x=20+i*(bw+gap);
      // additions going up
      fill(fc(pa(1),80+f.t*175));noStroke();
      rect(x,H/2-h1,bw,h1);
      // deletions going down
      fill(fc(pa(0),80+f.t*175));
      rect(x,H/2,bw,h2);
    }}
    // center line
    stroke(fc(PAL.fg,30));strokeWeight(0.5);line(20,H/2,W-20,H/2);
    // labels
    fill(fc(PAL.fg,50));noStroke();textSize(6);textAlign(CENTER,TOP);
    for(var i=0;i<n;i+=max(1,floor(n/15))){{
      push();translate(20+i*(bw+gap)+bw/2,H/2+D.files[i].d/maxC*(H*0.45)+4);
      rotate(PI/4);text(D.files[i].n.split('/').pop().substring(0,10),0,0);pop();
    }}
  }}else{{
    var bh=(H-40)/n-gap;
    for(var i=0;i<n;i++){{
      var f=D.files[i];
      var w1=f.a/maxC*(W*0.45);var w2=f.d/maxC*(W*0.45);
      var y=20+i*(bh+gap);
      fill(fc(pa(1),80+f.t*175));noStroke();rect(W/2,y,w1,bh);
      fill(fc(pa(0),80+f.t*175));rect(W/2-w2,y,w2,bh);
    }}
    stroke(fc(PAL.fg,30));strokeWeight(0.5);line(W/2,20,W/2,H-20);
    fill(fc(PAL.fg,50));noStroke();textSize(5);textAlign(RIGHT,CENTER);
    for(var i=0;i<n;i+=max(1,floor(n/20))){{
      text(D.files[i].n.split('/').pop().substring(0,15),W/2-D.files[i].d/maxC*(W*0.45)-4,20+i*(bh+gap)+bh/2);
    }}
  }}
  // tag
  fill(fc(PAL.fg,40));noStroke();textSize(9);textAlign(LEFT,TOP);text(D.tag,10,10);
  textAlign(RIGHT,TOP);text('+'+D.total_adds+' / -'+D.total_dels,W-10,10);
}}
"""


# ═══════════════════════════════════════════════════════════════
#  MODE 6: WOVEN TEXTILE
# ═══════════════════════════════════════════════════════════════

def _build_woven(seed, js_data, js_pal, rng):
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
{SHARED_JS}
function setup(){{createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(PAL.bg);
  var cols=constrain(floor(D.total_files/3)+8,8,50);
  var rows=constrain(floor(D.total_files/4)+6,6,40);
  var cw=W/(cols+1),rh=H/(rows+1);
  // warp threads (vertical)
  for(var c=1;c<=cols;c++){{
    var x=c*cw;
    stroke(fc(pa(c%PAL.acc.length),25+sr(c*7)*30));strokeWeight(0.6+sr(c*7+1)*1.5);
    for(var r=0;r<rows;r++){{
      var y1=r*rh+rh*0.3,y2=(r+1)*rh-rh*0.3;
      var weave=(c+r)%2===0;
      if(weave)line(x,y1,x,y2);
    }}
  }}
  // weft threads (horizontal)
  for(var r=1;r<=rows;r++){{
    var y=r*rh;
    stroke(fc(pa((r+2)%PAL.acc.length),20+sr(r*11)*35));strokeWeight(0.5+sr(r*11+1)*1.2);
    for(var c=0;c<cols;c++){{
      var x1=c*cw+cw*0.3,x2=(c+1)*cw-cw*0.3;
      var weave=(c+r)%2===0;
      if(!weave)line(x1,y,x2,y);
    }}
  }}
  // knots at intersections for files
  noStroke();
  for(var i=0;i<min(D.files.length,cols*rows);i++){{
    var c=(i%cols)+1,r=floor(i/cols)+1;
    if(r>rows)break;
    var f=D.files[i];
    fill(fc(f.a>f.d?pa(1):pa(0),20+f.t*60));
    circle(c*cw,r*rh,2+f.t*6);
  }}
  // border frame
  noFill();stroke(fc(PAL.fg,20));strokeWeight(0.5);
  rect(cw*0.5,rh*0.5,W-cw,H-rh);
  // tag
  fill(fc(PAL.fg,30));noStroke();textSize(7);textAlign(LEFT,BOTTOM);text(D.tag+'  '+D.total_files+' threads',cw,H-8);
}}
"""


# ═══════════════════════════════════════════════════════════════
#  MODE 7: TERMINAL DUMP
# ═══════════════════════════════════════════════════════════════

def _build_terminal(seed, js_data, js_pal, rng):
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
{SHARED_JS}
function setup(){{createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background('#0a0a0a');
  var g=color('#00ff41');
  var lh=14,x=20,y=20,col=0;
  function pr(s,c,sz){{fill(c||g);noStroke();textSize(sz||11);textAlign(LEFT,TOP);text(s,x,y);y+=lh;if(y>H-20){{y=20;x+=W/3;col++}}}}
  function prDim(s){{pr(s,fc('#00ff41',60),10)}}
  // header
  pr('hermes@archaeology:~$ ls -la '+D.tag,g,12);
  pr('total '+D.total_files+' (+'+D.total_adds+'/-'+D.total_dels+')',fc('#00ff41',80));
  pr('',g);
  // file listing
  for(var i=0;i<min(D.files.length,55);i++){{
    var f=D.files[i];
    var perm=f.a>f.d?'drwxr-xr-x':'----------';
    var line=perm+' '+String(f.c).padStart(5)+' '+f.n.substring(0,40);
    if(f.a>50)pr(line,color('#33ff66'));
    else if(f.d>50)pr(line,color('#ff4444'));
    else prDim(line);
    if(col>=3)break;
  }}
  pr('',g);
  // commit log
  pr('hermes@archaeology:~$ git log --oneline',g,12);y+=4;
  for(var i=0;i<min(D.commits.length,15);i++){{
    var sha=sr(i+800).toString(16).substring(2,9);
    pr(sha+' '+D.commits[i].substring(0,55),fc('#00ff41',50+sr(i+810)*100),10);
    if(col>=3)break;
  }}
  // cursor blink
  fill(g);noStroke();rect(x,y+2,7,12);
  // CRT scanline effect
  for(var sy=0;sy<H;sy+=2){{
    fill(0,0,0,25);noStroke();rect(0,sy,W,1);
  }}
  // authors top-right
  fill(fc('#00ff41',40));textSize(8);textAlign(RIGHT,TOP);
  for(var i=0;i<D.authors.length;i++)text(D.authors[i],W-15,15+i*12);
}}
"""


# ═══════════════════════════════════════════════════════════════
#  MODE 8: NOISE LANDSCAPE
# ═══════════════════════════════════════════════════════════════

def _build_landscape(seed, js_data, js_pal, rng):
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
{SHARED_JS}
function setup(){{createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(PAL.bg);
  // flowing terrain lines
  var layers=constrain(D.dirs.length+3,5,20);
  noFill();
  for(var l=0;l<layers;l++){{
    var baseY=map(l,0,layers-1,H*0.15,H*0.85);
    var amp=30+sr(l*7)*80;
    var freq=0.003+sr(l*7+1)*0.008;
    var c=color(pa(l));
    stroke(red(c),green(c),blue(c),20+l*8);
    strokeWeight(0.5+sr(l*7+2)*1.5);
    beginShape();
    for(var x=0;x<=W;x+=3){{
      var n=noise(x*freq+l*10,l*0.5)*amp;
      var y=baseY+n+(sin(x*0.01+l)*20);
      vertex(x,y);
    }}
    endShape();
  }}
  // particles along the flow
  noStroke();
  for(var i=0;i<min(D.total_files,300);i++){{
    var px=sr(i*11+500)*W;
    var py=sr(i*11+501)*H;
    var n=noise(px*0.005,py*0.005,SEED*0.001);
    var sz=1+n*4;
    fill(fc(pa(floor(n*PAL.acc.length)),30+n*80));
    circle(px,py,sz);
  }}
  // subtle text at bottom
  fill(fc(PAL.fg,20));noStroke();textSize(8);textAlign(LEFT,BOTTOM);
  text(D.tag,20,H-15);
  textSize(6);fill(fc(PAL.fg,15));
  text(D.total_files+' formations',20,H-5);
  // filenames as whispers
  fill(fc(PAL.fg,12));textSize(6);textAlign(LEFT,TOP);
  for(var i=0;i<min(D.filenames.length,15);i++){{
    text(D.filenames[i],sr(i*3+800)*W*0.9,sr(i*3+801)*H*0.9);
  }}
}}
"""


# ═══════════════════════════════════════════════════════════════
#  MODE 9: STACKED FRAGMENTS / COLLAGE PANELS
# ═══════════════════════════════════════════════════════════════

def _build_fragments(seed, js_data, js_pal, rng):
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
{SHARED_JS}
function setup(){{createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(PAL.bg);
  var panels=constrain(floor(D.total_files/10)+4,4,15);
  // layered translucent panels
  for(var i=0;i<panels;i++){{
    push();
    var px=sr(i*9)*W*0.6-W*0.1,py=sr(i*9+1)*H*0.6-H*0.1;
    var pw=150+sr(i*9+2)*350,ph=100+sr(i*9+3)*300;
    var ang=(sr(i*9+4)-0.5)*0.15;
    translate(px+pw/2,py+ph/2);rotate(ang);translate(-pw/2,-ph/2);
    // panel bg
    fill(fc(pa(i),15+sr(i*9+5)*25));noStroke();rect(0,0,pw,ph,2);
    // panel border
    noFill();stroke(fc(PAL.fg,20+sr(i*9+6)*30));strokeWeight(0.4);rect(0,0,pw,ph,2);
    // content inside panel
    var ct=floor(sr(i*9+7)*4);
    if(ct===0&&D.files.length>0){{
      // file listing fragment
      fill(fc(PAL.fg,60));noStroke();textSize(7);textAlign(LEFT,TOP);
      for(var j=0;j<min(8,D.files.length);j++){{
        var fi=(i*7+j)%D.files.length;
        text(D.files[fi].n.substring(0,floor(pw/5)),8,8+j*12);
      }}
    }}else if(ct===1&&D.commits.length>0){{
      // commit message
      fill(fc(PAL.fg,50));noStroke();textSize(10+sr(i*9+8)*12);textAlign(LEFT,TOP);
      var ci=i%D.commits.length;
      text(D.commits[ci].substring(0,floor(pw/7)),8,8);
    }}else if(ct===2){{
      // diff marks
      fill(fc('#00aa44',50));noStroke();textSize(16);textAlign(CENTER,CENTER);
      text('+'+D.total_adds,pw/2,ph*0.35);
      fill(fc('#cc3333',50));text('-'+D.total_dels,pw/2,ph*0.65);
    }}else{{
      // geometric fill
      noFill();stroke(fc(pa(i),30));strokeWeight(0.3);
      for(var k=0;k<8;k++){{
        var gx=sr(i*100+k*13)*pw,gy=sr(i*100+k*13+1)*ph;
        var gs=5+sr(i*100+k*13+2)*20;
        if(k%3===0)circle(gx,gy,gs);
        else rect(gx-gs/2,gy-gs/2,gs,gs);
      }}
    }}
    pop();
  }}
  // connecting lines between panels
  stroke(fc(PAL.fg,10));strokeWeight(0.2);
  for(var i=0;i<panels-1;i++){{
    var x1=sr(i*9)*W*0.6+75,y1=sr(i*9+1)*H*0.6+50;
    var x2=sr((i+1)*9)*W*0.6+75,y2=sr((i+1)*9+1)*H*0.6+50;
    line(x1,y1,x2,y2);
  }}
  // tag
  fill(fc(PAL.fg,25));noStroke();textSize(8);textAlign(RIGHT,BOTTOM);text(D.tag,W-15,H-10);
}}
"""


STYLE_BUILDERS = {
    0: _build_collage,
    1: _build_typographic,
    2: _build_blueprint,
    3: _build_glitch,
    4: _build_minimal,
    5: _build_bars,
    6: _build_woven,
    7: _build_terminal,
    8: _build_landscape,
    9: _build_fragments,
    10: _build_ai_detection,
    11: _build_scattered_text,
    12: _build_trial3_type,
    13: _build_contour_shapes,
    14: _build_geo_data,
}
