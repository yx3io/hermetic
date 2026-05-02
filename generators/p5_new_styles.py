"""
New P5.js visual styles ported from the external p5 project.
Each builder returns a self-contained JS sketch string that embeds
the layer aesthetic as procedural code (no class wrapper needed).
Text content is injected from the D data object (daily commit data).
"""


def _build_ai_detection(seed, js_data, js_pal, rng):
    """Mode 10: AI Detection HUD — bounding boxes, labels, scan line, tracking."""
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
var W,H;
function sr(i){{return fract(sin(i*127.1+SEED*311.7)*43758.5453)}}
function fract(x){{return x-floor(x)}}
function setup(){{W=windowWidth||1200;H=windowHeight||900;createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(0);
  stroke(30,30,35,25);strokeWeight(0.5);
  for(var x=0;x<W;x+=40)line(x,0,x,H);
  for(var y=0;y<H;y+=40)line(0,y,W,y);
  noStroke();
  for(var x=0;x<W;x+=40)for(var y=0;y<H;y+=40){{
    if(sr(x*7+y*13+100)<0.08){{fill(100,240,80,5+sr(x+y)*15);rect(x,y,40,40)}}
  }}
  var labels=[];
  for(var i=0;i<D.commits.length;i++)labels.push(D.commits[i].split(' ').slice(0,2).join(' ').substring(0,15).toUpperCase());
  for(var i=0;i<D.filenames.length;i++)labels.push(D.filenames[i].toUpperCase());
  if(labels.length===0)labels.push('UNKNOWN');
  var nb=constrain(floor(D.total_files/8)+10,10,35);
  for(var i=0;i<nb;i++){{
    var bw=40+sr(i*7)*140,bh=50+sr(i*7+1)*170;
    var bx=sr(i*7+2)*(W-bw-20)+10,by=sr(i*7+3)*(H-bh-40)+30;
    var conf=floor(8+sr(i*7+4)*91);
    var c=conf>70?[100,240,80]:(conf>40?[255,200,0]:[240,80,130]);
    var a=180+sr(i*7+5)*70;
    var isCorner=sr(i*7+6)>0.6;
    noFill();strokeWeight(sr(i*7+8)<0.3?2.5:1.5);stroke(c[0],c[1],c[2],a);
    if(!isCorner){{rect(bx,by,bw,bh)}}
    else{{
      var cl=min(bw,bh)*0.25;
      line(bx,by,bx+cl,by);line(bx,by,bx,by+cl);
      line(bx+bw,by,bx+bw-cl,by);line(bx+bw,by,bx+bw,by+cl);
      line(bx,by+bh,bx+cl,by+bh);line(bx,by+bh,bx,by+bh-cl);
      line(bx+bw,by+bh,bx+bw-cl,by+bh);line(bx+bw,by+bh,bx+bw,by+bh-cl);
    }}
    var lbl=labels[i%labels.length]+'  '+conf+'%';
    textSize(10);textAlign(LEFT,TOP);
    var tw=textWidth(lbl)+8,ly=by<16?by+2:by-16;
    noStroke();fill(c[0],c[1],c[2],a*0.9);rect(bx,ly,tw,14);
    fill(0,0,0,a+30);text(lbl,bx+4,ly+2);
    fill(c[0],c[1],c[2],a*0.5);textSize(7);
    text('ID:'+floor(1000+sr(i*7+9)*8999),bx+bw-35,by+bh+3);
    noStroke();fill(60,65,75,a*0.5);rect(bx,by+bh+2,bw*0.6,3);
    fill(c[0],c[1],c[2],a*0.8);rect(bx,by+bh+2,bw*0.6*conf/100,3);
  }}
  stroke(255,200,0,25);strokeWeight(0.5);
  for(var i=0;i<15;i++){{
    var x1=sr(i*11+300)*W,y1=sr(i*11+301)*H;
    var x2=sr(i*11+302)*W,y2=sr(i*11+303)*H;
    if(dist(x1,y1,x2,y2)<250){{
      for(var dd=0;dd<dist(x1,y1,x2,y2);dd+=9){{
        var tt=dd/max(1,dist(x1,y1,x2,y2));
        if(floor(dd/5)%2===0)point(lerp(x1,x2,tt),lerp(y1,y2,tt));
      }}
    }}
  }}
  stroke(255,200,0);strokeWeight(1);noFill();
  for(var i=0;i<20;i++){{
    var cx=sr(i*5+500)*(W-60)+5,cy=sr(i*5+501)*(H-60)+5;
    var cw=20+sr(i*5+502)*40,ch=20+sr(i*5+503)*40;
    var cl2=5+sr(i*5+504)*10,ca=30+sr(i*5+505)*50;
    stroke(255,200,0,ca);
    line(cx,cy,cx+cl2,cy);line(cx,cy,cx,cy+cl2);
    line(cx+cw,cy,cx+cw-cl2,cy);line(cx+cw,cy,cx+cw,cy+cl2);
    line(cx,cy+ch,cx+cl2,cy+ch);line(cx,cy+ch,cx,cy+ch-cl2);
    line(cx+cw,cy+ch,cx+cw-cl2,cy+ch);line(cx+cw,cy+ch,cx+cw,cy+ch-cl2);
  }}
  var scanY=sr(777)*H;
  stroke(100,240,80,60);strokeWeight(1);line(0,scanY,W,scanY);
  for(var i=1;i<15;i++){{stroke(100,240,80,60*(1-i/15));line(0,scanY-i*2,W,scanY-i*2)}}
  var dataTexts=['FILES: '+D.total_files,'ADDS: +'+D.total_adds,'DELS: -'+D.total_dels,
    'TAG: '+D.tag,'AUTHORS: '+D.authors.join(', ').substring(0,40)];
  for(var i=0;i<D.filenames.length;i++)dataTexts.push(D.filenames[i].toUpperCase());
  noStroke();
  for(var i=0;i<40;i++){{
    var dt=dataTexts[i%dataTexts.length];
    var dx=sr(i*3+600)*(W-100)+5,dy=sr(i*3+601)*(H-10)+25;
    fill(100,240,80,20+sr(i*3+602)*35);textSize(7+sr(i*3+603)*4);textAlign(LEFT,TOP);
    if(sr(i*3+604)<0.1){{push();translate(dx,dy);rotate(HALF_PI);text(dt,0,0);pop()}}
    else text(dt,dx,dy);
  }}
  stroke(100,240,80,100);strokeWeight(2);noFill();
  var m=15,cl3=50;
  line(m,m,m+cl3,m);line(m,m,m,m+cl3);
  line(W-m,m,W-m-cl3,m);line(W-m,m,W-m,m+cl3);
  line(m,H-m,m+cl3,H-m);line(m,H-m,m,H-m-cl3);
  line(W-m,H-m,W-m-cl3,H-m);line(W-m,H-m,W-m,H-m-cl3);
  fill(100,240,80,100);noStroke();textSize(9);textAlign(LEFT,TOP);
  text('HERMETIC  TAG:'+D.tag+'  FILES:'+D.total_files,m+5,m+8);
  text('COMMITS: '+D.commits.length+'  |  +'+D.total_adds+' -'+D.total_dels,m+5,m+20);
  textAlign(RIGHT,BOTTOM);fill(100,240,80,70);textSize(8);
  text('DETECTIONS: '+nb+'  |  ANALYSIS COMPLETE',W-m-5,H-m-5);
}}
"""


def _build_scattered_text(seed, js_data, js_pal, rng):
    """Mode 11: Scattered Text — poetic floating words on white."""
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
var W,H;
function sr(i){{return fract(sin(i*127.1+SEED*311.7)*43758.5453)}}
function fract(x){{return x-floor(x)}}
function setup(){{W=windowWidth||1200;H=windowHeight||900;createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(255);
  var words=[];
  for(var i=0;i<D.commits.length;i++){{
    var parts=D.commits[i].split(' ');
    for(var j=0;j<parts.length;j++)if(parts[j].length>2)words.push(parts[j]);
  }}
  for(var i=0;i<D.filenames.length;i++)words.push(D.filenames[i]);
  for(var i=0;i<D.authors.length;i++)words.push(D.authors[i]);
  words.push(D.tag,'+'+D.total_adds,'-'+D.total_dels,D.total_files+' files');
  var syms=['&&','&&&','**','****','""','\\u00b0','\\u00b7\\u00b7','\\u2022','***',
    '\\u2206\\u2206','\\u221e','\\u00a7','\\u00b6','\\u00ab','\\u00bb'];
  fill(15);noStroke();
  for(var i=0;i<55;i++){{
    var txt=words[i%words.length];
    var sz=txt.length>15?random(6,9):(random()<0.2?random(14,22):random(8,13));
    textSize(sz);textAlign(LEFT,TOP);
    text(txt,sr(i*9)*W*0.9+W*0.03,sr(i*9+1)*H*0.94+H*0.02);
  }}
  textSize(8);
  var py=H*0.65;
  for(var i=0;i<min(D.commits.length,12);i++){{
    var cx=sr(i+200)<0.5?W*0.15:W*0.35;
    fill(15);text(D.commits[i].substring(0,65),cx,py+i*13);
  }}
  for(var i=0;i<20;i++){{
    fill(15);textSize(8+sr(i+300)*6);textAlign(LEFT,TOP);
    text(syms[floor(sr(i+301)*syms.length)],sr(i+302)*W*0.9+W*0.05,sr(i+303)*H*0.9+H*0.03);
  }}
  var deco=['\\u2206\\u2206 \\u00b7\\u00b7\\u00b7\\u00b7\\u00b7 \\u00b0',
    '\\u221e \\u2206\\u2206\\u2206','+++\\u2206\\u2206\\u2206\\u2206',
    '\\u2206 .... ]]','\\u00b6__ ]]]]]\\u00ab',
    '||-------\\u00b0 \\u00b6\\u00b6','______ \\u221e\\u221e\\u221e\\u221e \\u00ab',
    '\\u00b0\\u00b0\\u00b0\\u00b0 ___---___'];
  for(var i=0;i<8;i++){{
    fill(15);textSize(9+sr(i+400)*4);textAlign(LEFT,TOP);
    text(deco[i],sr(i+401)*W*0.7+W*0.03,sr(i+402)*H*0.9+H*0.05);
  }}
  noStroke();fill(15);
  for(var i=0;i<8;i++){{
    var bw=60+sr(i+500)*290,bh=sr(i+501)<0.5?3+sr(i+502)*5:10+sr(i+503)*15;
    rect(sr(i+504)*W*0.7+W*0.02,sr(i+505)*H*0.87+H*0.05,bw,bh);
  }}
  stroke(15);
  for(var i=0;i<12;i++){{
    strokeWeight(0.5+sr(i+600)*1.5);
    var lx=sr(i+601)*W*0.3;
    line(lx,sr(i+602)*H*0.9+H*0.05,lx+80+sr(i+603)*W*0.5,sr(i+602)*H*0.9+H*0.05);
  }}
  noStroke();fill(15);
  for(var i=0;i<8;i++){{
    var dx=sr(i+700)*W*0.4+W*0.02,dy=sr(i+701)*H*0.9+H*0.05;
    var dlen=60+sr(i+702)*W*0.4,dw=3+sr(i+703)*9,gap=2+sr(i+704)*3;
    var xd=dx;while(xd<dx+dlen){{rect(xd,dy,dw,1+sr(i+705)*1.5);xd+=dw+gap}}
  }}
  for(var i=0;i<6;i++){{
    var nd=4+floor(sr(i+800)*8),dots='';for(var d=0;d<nd;d++)dots+='\\u25cf';
    fill(15);textSize(8+sr(i+801)*6);textAlign(LEFT,TOP);
    text(dots,sr(i+802)*W*0.8+W*0.03,sr(i+803)*H*0.85+H*0.1);
  }}
  for(var i=0;i<8;i++){{
    fill(15);noStroke();var sq=4+sr(i+900)*10;
    rect(sr(i+901)*W*0.92+W*0.03,sr(i+902)*H*0.92+H*0.03,sq,sq);
  }}
}}
"""


def _build_trial3_type(seed, js_data, js_pal, rng):
    """Mode 12: Trial3 Bold Typography — huge text, character blocks, bitmap numbers."""
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
var W,H;
function sr(i){{return fract(sin(i*127.1+SEED*311.7)*43758.5453)}}
function fract(x){{return x-floor(x)}}
var FONT={{'0':[0x3E,0x51,0x49,0x45,0x3E],'1':[0x00,0x42,0x7F,0x40,0x00],
'2':[0x42,0x61,0x51,0x49,0x46],'3':[0x21,0x41,0x45,0x4B,0x31],
'4':[0x18,0x14,0x12,0x7F,0x10],'5':[0x27,0x45,0x45,0x45,0x39],
'6':[0x3C,0x4A,0x49,0x49,0x30],'7':[0x01,0x71,0x09,0x05,0x03],
'8':[0x36,0x49,0x49,0x49,0x36],'9':[0x06,0x49,0x49,0x29,0x1E]}};
function setup(){{W=windowWidth||1200;H=windowHeight||900;createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(26);
  var bigWords=[];
  if(D.commits.length>0){{
    var parts=D.commits[0].split(' ');
    for(var i=0;i<min(parts.length,3);i++)if(parts[i].length>2)bigWords.push(parts[i].toUpperCase());
  }}
  bigWords.push(D.tag.toUpperCase());
  if(D.authors.length>0)bigWords.push(D.authors[0].toUpperCase());
  bigWords.push('+'+D.total_adds);bigWords.push(D.total_files+' FILES');
  var positions=[[0.02,0.18,65],[0.05,0.30,55],[0.38,0.52,80],[0.1,0.72,60],[0.55,0.08,90],[0.58,0.82,55]];
  var colors=[[230,230,225],[220,220,215],[50,50,220],[180,180,175],[100,240,80],[50,50,220]];
  textStyle(BOLD);textAlign(LEFT,TOP);
  for(var i=0;i<min(bigWords.length,positions.length);i++){{
    var p=positions[i],c=colors[i];
    fill(c[0],c[1],c[2],200);textSize(p[2]);
    text(bigWords[i].substring(0,12),W*p[0],H*p[1]);
  }}
  textStyle(NORMAL);
  var lbls=[];
  for(var i=0;i<D.filenames.length;i++)lbls.push('['+D.filenames[i]+']');
  for(var i=0;i<D.dirs.length;i++)lbls.push(D.dirs[i].name+'/');
  for(var i=0;i<min(lbls.length,16);i++){{
    var c=sr(i+100)>0.6?[50,50,220]:[180,180,175];
    fill(c[0],c[1],c[2],170);textSize(11+sr(i+101)*11);textAlign(LEFT,TOP);
    text(lbls[i].substring(0,25),sr(i+102)*W*0.85+W*0.05,sr(i+103)*H*0.85+H*0.05);
  }}
  var chars='CP68+(<)XMWN';
  var pals=[[50,50,220],[240,80,130],[255,200,0],[100,240,80]];
  noStroke();
  for(var i=0;i<20;i++){{
    var pc=pals[floor(sr(i+200)*pals.length)];
    var sz=25+sr(i+201)*55;
    if(sr(i+202)>0.3){{
      fill(pc[0],pc[1],pc[2],60+sr(i+203)*80);
      rect(sr(i+204)*W-4,sr(i+205)*H-sz*0.7,sz*0.8,sz);
    }}
    fill(255,255,255,120+sr(i+206)*100);textSize(sz);textAlign(CENTER,CENTER);
    text(chars[floor(sr(i+207)*chars.length)],sr(i+204)*W,sr(i+205)*H);
  }}
  noStroke();
  var bigNums=[['5',0.02,0.4,22],['0',0.8,0.2,18],['8',0.35,0.6,25],['1',0.7,0.45,20],['3',0.15,0.85,16]];
  for(var bi=0;bi<bigNums.length;bi++){{
    var bn=bigNums[bi];var glyph=FONT[bn[0]];if(!glyph)continue;
    var gc=sr(bn[1]*10+bn[2]*10)>0.5?[220,220,215]:[100,240,80];
    fill(gc[0],gc[1],gc[2],200);
    for(var col=0;col<5;col++){{
      var cd=glyph[col];
      for(var row=0;row<7;row++){{if((cd>>row)&1)rect(W*bn[1]+col*bn[3],H*bn[2]+row*bn[3],bn[3]-1,bn[3]-1)}}
    }}
  }}
  for(var i=0;i<30;i++){{
    var ch=String(floor(sr(i+400)*10));var glyph=FONT[ch];if(!glyph)continue;
    var sc=4+sr(i+401)*6;
    var gc=sr(i+402)>0.7?[100,240,80]:[180,180,175];
    fill(gc[0],gc[1],gc[2],200);
    for(var col=0;col<5;col++){{
      var cd=glyph[col];
      for(var row=0;row<7;row++){{if((cd>>row)&1)rect(sr(i+403)*W+col*sc,sr(i+404)*H+row*sc,sc-1,sc-1)}}
    }}
  }}
  for(var i=0;i<12;i++){{
    stroke(120,120,120,40+sr(i+501)*60);strokeWeight(0.3+sr(i+500)*1.2);
    line(sr(i+502)*W,sr(i+503)*H,sr(i+504)*W,sr(i+505)*H);
  }}
  noStroke();
  var brTypes=['{','}','[',']','(',')','<','>'];
  for(var i=0;i<8;i++){{
    fill(50,50,220,60+sr(i+600)*80);textSize(30+sr(i+601)*50);textAlign(CENTER,CENTER);
    text(brTypes[i],sr(i+602)*W*0.85+W*0.07,sr(i+603)*H*0.85+H*0.07);
  }}
}}
"""


def _build_contour_shapes(seed, js_data, js_pal, rng):
    """Mode 13: Contour Shapes — organic topographic curves, labels, compass."""
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
var W,H;
function sr(i){{return fract(sin(i*127.1+SEED*311.7)*43758.5453)}}
function fract(x){{return x-floor(x)}}
function makeBlob(cx,cy,radius,numPts,wobble){{
  wobble=wobble||0.5;var pts=[];var sd=sr(cx*0.01+cy*0.01)*1000;
  for(var i=0;i<numPts;i++){{
    var angle=(i/numPts)*TWO_PI;
    var n=noise(sd+cos(angle)*2,sin(angle)*2);
    var r=radius*(0.6+n*wobble*1.5);
    r+=sin(angle*3+sd)*radius*0.1;r+=cos(angle*5+sd*2)*radius*0.06;
    pts.push({{x:cx+cos(angle)*r,y:cy+sin(angle)*r}});
  }}
  return pts;
}}
function setup(){{W=windowWidth||1200;H=windowHeight||900;createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(252,250,245);
  var peaks=[];
  for(var i=0;i<floor(8+sr(50)*8);i++){{
    peaks.push({{x:sr(i*3+100)*W*0.9+W*0.05,y:sr(i*3+101)*H*0.9+H*0.05,
      strength:60+sr(i*3+102)*80,radius:40+sr(i*3+103)*110}});
  }}
  var levels=[20,40,60,80,100,120];
  noFill();stroke(30);strokeWeight(0.7);
  for(var li=0;li<levels.length;li++){{
    var level=levels[li];
    for(var pi=0;pi<peaks.length;pi++){{
      var pk=peaks[pi];if(pk.strength<level)continue;
      var numRings=floor((pk.strength-level)/25)+1;
      for(var ring=0;ring<min(numRings,3);ring++){{
        var r=pk.radius*(1-level/pk.strength)*(1-ring*0.25);
        if(r<8)continue;
        var pts=makeBlob(pk.x,pk.y,r,30+floor(sr(pi*7+ring*3+li)*20));
        beginShape();
        for(var k=0;k<pts.length;k++)curveVertex(pts[k].x,pts[k].y);
        curveVertex(pts[0].x,pts[0].y);curveVertex(pts[1].x,pts[1].y);
        if(pts.length>2)curveVertex(pts[2].x,pts[2].y);
        endShape();
        var lp=pts[floor(pts.length*0.25)];
        if(lp.x>10&&lp.x<W-30&&lp.y>10&&lp.y<H-10){{
          noStroke();fill(30);textSize(7);textAlign(LEFT,CENTER);text(level,lp.x+2,lp.y);
          noFill();stroke(30);strokeWeight(0.7);
        }}
      }}
    }}
  }}
  for(var i=0;i<floor(5+sr(200)*5);i++){{
    var cx=sr(i*5+210)*W*0.8+W*0.1,cy=sr(i*5+211)*H*0.7+H*0.15;
    var r=60+sr(i*5+212)*190;
    var pts=makeBlob(cx,cy,r,40+floor(sr(i*5+213)*30),0.4+sr(i*5+214)*0.6);
    noFill();stroke(30);strokeWeight(sr(i+215)<0.3?random(1.5,2.5):random(0.6,1.2));
    beginShape();
    for(var k=0;k<pts.length;k++)curveVertex(pts[k].x,pts[k].y);
    curveVertex(pts[0].x,pts[0].y);curveVertex(pts[1].x,pts[1].y);
    if(pts.length>2)curveVertex(pts[2].x,pts[2].y);
    endShape();
  }}
  var gw=sr(300)*W*0.15+W*0.2,gh=sr(301)*H*0.1+H*0.12;
  var gx=sr(302)*W*0.4+W*0.15,gy=sr(303)*H*0.3+H*0.2;
  var gCols=floor(3+sr(304)*3),gRows=floor(2+sr(305)*2);
  push();translate(gx+gw/2,gy+gh/2);rotate((sr(306)-0.5)*0.3);
  noFill();stroke(30);strokeWeight(0.5);rect(-gw/2,-gh/2,gw,gh);
  for(var c=1;c<gCols;c++){{var xg=-gw/2+(gw/gCols)*c;line(xg,-gh/2,xg,gh/2)}}
  for(var r=1;r<gRows;r++){{var yg=-gh/2+(gh/gRows)*r;line(-gw/2,yg,gw/2,yg)}}
  pop();
  stroke(30);strokeWeight(1);
  line(gx+gw+5,gy+gh*0.5,gx+gw+35,gy+gh*0.5+15);
  var compassX=W*0.3,compassY=H*0.88;
  stroke(30);strokeWeight(1);
  line(compassX,compassY,compassX+50,compassY);
  line(compassX+50,compassY,compassX+44,compassY-4);
  line(compassX+50,compassY,compassX+44,compassY+4);
  noStroke();fill(30);textSize(10);textAlign(LEFT,CENTER);text('N',compassX+55,compassY);
  var sbx=W*0.05,sby=H*0.91;
  stroke(30);strokeWeight(1);line(sbx,sby,sbx+90,sby);
  for(var i=0;i<4;i++){{
    if(i%2===0)fill(30);else fill(252,250,245);
    stroke(30);strokeWeight(0.5);rect(sbx+i*22.5,sby-4,22.5,8);
  }}
  noStroke();fill(30);textFont('monospace');
  textSize(9);textAlign(LEFT,TOP);
  text('HERMETIC   '+D.tag,W*0.05,H*0.02);
  textAlign(RIGHT,TOP);text(D.total_files+' FILES  +'+D.total_adds+'/-'+D.total_dels,W*0.95,H*0.02);
  textSize(8);textAlign(LEFT,TOP);
  text('TOPOGRAPHY [n.]',W*0.05,H*0.97);
  if(D.commits.length>0)text(D.commits[0].substring(0,30),W*0.35,H*0.97);
  textSize(7);
  text('0',sbx,sby+6);text('10',sbx+40,sby+6);text('20 M.',sbx+80,sby+6);
}}
"""


def _build_geo_data(seed, js_data, js_pal, rng):
    """Mode 14: Geo Data — circuit traces, waveforms, hex clusters, data readouts."""
    return f"""
var SEED={seed};var D={js_data};var PAL={js_pal};
var W,H;
function sr(i){{return fract(sin(i*127.1+SEED*311.7)*43758.5453)}}
function fract(x){{return x-floor(x)}}
function drawHex(cx,cy,r){{beginShape();for(var i=0;i<6;i++){{var a=i*PI/3-PI/6;vertex(cx+cos(a)*r,cy+sin(a)*r)}}endShape(CLOSE)}}
function setup(){{W=windowWidth||1200;H=windowHeight||900;createCanvas(W,H);randomSeed(SEED);noiseSeed(SEED);textFont('monospace');noLoop()}}
function draw(){{
  background(248,248,244);
  noFill();
  for(var i=0;i<25;i++){{
    var path=[];var x=sr(i*20)*W,y=sr(i*20+1)*H;
    path.push([x,y]);
    var segs=floor(4+sr(i*20+2)*8);
    for(var s=0;s<segs;s++){{
      if(s%2===0)x+=sr(i*20+3+s)*400-200;else y+=sr(i*20+3+s)*300-150;
      x=constrain(x,5,W-5);y=constrain(y,5,H-5);path.push([x,y]);
    }}
    var ca=sr(i+50)>0.6?[50,50,220]:[80,80,180];
    stroke(ca[0],ca[1],ca[2],40+sr(i+51)*80);strokeWeight(0.5+sr(i+52)*1);
    beginShape();for(var j=0;j<path.length;j++)vertex(path[j][0],path[j][1]);endShape();
    if(sr(i+53)>0.3){{
      var last=path[path.length-1];
      fill(ca[0],ca[1],ca[2],80+sr(i+54)*80);noStroke();ellipse(last[0],last[1],4,4);noFill();
    }}
  }}
  for(var i=0;i<12;i++){{
    var x1=sr(i*6+200)*W,y1=sr(i*6+201)*H;
    var x2=x1+sr(i*6+202)*600-300,y2=y1+sr(i*6+203)*400-200;
    var cx1=x1+sr(i*6+204)*200-100,cy1=y1+sr(i*6+205)*200-100;
    var cx2=x2+sr(i*6+206)*200-100,cy2=y2+sr(i*6+207)*200-100;
    noFill();stroke(50,50,220,40);strokeWeight(0.6);
    bezier(x1,y1,cx1,cy1,cx2,cy2,x2,y2);
    var t=sr(i+250);
    var px=bezierPoint(x1,cx1,cx2,x2,t),py=bezierPoint(y1,cy1,cy2,y2,t);
    fill(80,80,255,150);noStroke();ellipse(px,py,4,4);
  }}
  var wavePos=[[0.05,0.1],[0.4,0.08],[0.7,0.15],[0.1,0.4],[0.55,0.5],
    [0.8,0.45],[0.2,0.7],[0.5,0.75],[0.85,0.8],[0.15,0.92],[0.6,0.9]];
  noFill();stroke(50,50,220,90);strokeWeight(0.8);
  for(var i=0;i<wavePos.length;i++){{
    var wp=wavePos[i],wx=W*wp[0],wy=H*wp[1];
    var ww=80+sr(i+300)*120,freq=0.02+sr(i+301)*0.06,amp=8+sr(i+302)*17;
    var isSine=sr(i+303)>0.5;
    beginShape();
    for(var x=0;x<ww;x+=2){{
      var val=isSine?sin(x*freq)*amp:(noise(sr(i+304)*1000+x*0.03)-0.5)*amp*2;
      vertex(wx+x,wy+val);
    }}
    endShape();
    stroke(50,50,220,25);line(wx,wy,wx+ww,wy);stroke(50,50,220,90);
  }}
  for(var i=0;i<8;i++){{
    var hcx=sr(i*4+400)*W*0.8+W*0.1,hcy=sr(i*4+401)*H*0.8+H*0.1;
    var hexR=6+sr(i*4+402)*6,rings=floor(1+sr(i*4+403)*2);
    stroke(40,40,200,80);strokeWeight(0.6);noFill();
    drawHex(hcx,hcy,hexR);
    for(var ring=1;ring<=rings;ring++){{
      for(var a=0;a<6;a++){{
        var angle=a*PI/3;
        var cx=hcx+cos(angle)*hexR*1.8*ring,cy=hcy+sin(angle)*hexR*1.8*ring;
        drawHex(cx,cy,hexR);
        if(sr(i*6+a+500)>0.6){{fill(40,40,200,50);noStroke();drawHex(cx,cy,hexR*0.6);noFill();stroke(40,40,200,80);strokeWeight(0.6)}}
      }}
    }}
  }}
  strokeWeight(0.8);
  for(var i=0;i<18;i++){{
    var fx=sr(i*3+600)*W,fy=sr(i*3+601)*H;
    var fa=sr(i*3+602)*TWO_PI,fl=20+sr(i*3+603)*40;
    var ex=fx+cos(fa)*fl,ey=fy+sin(fa)*fl;
    stroke(60,60,200,60);line(fx,fy,ex,ey);
    line(ex,ey,ex-cos(fa-0.4)*6,ey-sin(fa-0.4)*6);
    line(ex,ey,ex-cos(fa+0.4)*6,ey-sin(fa+0.4)*6);
  }}
  var readouts=[];
  readouts.push('TAG: '+D.tag,'FILES: '+D.total_files,'ADDS: +'+D.total_adds,'DELS: -'+D.total_dels);
  for(var i=0;i<D.authors.length;i++)readouts.push('AUTH: '+D.authors[i]);
  for(var i=0;i<D.dirs.length;i++)readouts.push('DIR: '+D.dirs[i].name+' ('+D.dirs[i].count+')');
  for(var i=0;i<D.filenames.length&&readouts.length<20;i++)readouts.push(D.filenames[i].toUpperCase());
  textFont('monospace');textSize(8);textAlign(LEFT);noStroke();fill(50,50,220,120);
  for(var i=0;i<readouts.length;i++){{
    text(readouts[i],(i%5)/5*W+sr(i+700)*W*0.12+10,floor(i/5)/4*H+sr(i+701)*H*0.12+10);
  }}
  noStroke();
  for(var i=0;i<5;i++){{
    var rx=sr(i*3+800)*W*0.75+W*0.05,ry=sr(i*3+801)*H*0.75+H*0.05;
    var cols=floor(10+sr(i*3+802)*15),rows=floor(5+sr(i*3+803)*7);
    var sp=4+sr(i*3+804)*3;
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){{
      if(sr(i*100+r*cols+c+900)<0.4){{
        var b=sr(i*100+r*cols+c+950)*180;
        fill(30,30,b+60,b);rect(rx+c*sp,ry+r*sp,sp-1,sp-1);
      }}
    }}
  }}
}}
"""
