// @ts-nocheck
import type p5 from "p5";

interface HStrip {
  y: number;
  text: string;
  size: number;
  color: number[];
  bold: boolean;
}

interface VStrip {
  x: number;
  chars: string[];
  size: number;
  color: number[];
}

interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  weight: number;
  color: number[];
}

interface ScatteredGroup {
  x: number;
  y: number;
  text: string;
  size: number;
  color: number[];
}

class CharBordersLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  hStrips: HStrip[];
  vStrips: VStrip[];
  frames: Frame[];
  scatteredGroups: ScatteredGroup[];
  t: number;
  patterns: string[];
  smallTexts: string[];

  constructor(w: number, h: number, p: p5, patterns?: string[], smallTexts?: string[]) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.hStrips = [];
    this.vStrips = [];
    this.frames = [];
    this.scatteredGroups = [];
    this.t = 0;
    this.patterns = patterns ?? [
      "(+(8++(88(+(+8(8(((8+++8",
      "8nn8n88nn8n88n8nn8n88n8n",
      "<(<8C(8+C(<8C(+8C(<(8+C",
      "010jJ501010jJ501010jJ501",
      "+++---+++---+++---+++---",
    ];
    this.smallTexts = smallTexts ?? [
      "n8", "8nn", "+88(", "C8", "<(", "888n8",
      "8mn", "n8n", "0j", "j5", "(+", "88"
    ];
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let hYs = [0.0, 0.06, 0.18, 0.33, 0.5, 0.67, 0.82, 0.94];
    for (let i = 0; i < hYs.length; i++) {
      let pat = this.patterns[i % this.patterns.length];
      let fullLine = "";
      while (fullLine.length < 250) fullLine += pat;
      this.hStrips.push({
        y: this.h * hYs[i],
        text: fullLine,
        size: this.p.random([7, 8, 9, 10]),
        color: this.p.random() > 0.6 ? [60, 60, 55] : [150, 150, 145],
        bold: this.p.random() > 0.7
      });
    }

    let vXs = [0.0, 0.22, 0.45, 0.72, 0.95];
    for (let i = 0; i < vXs.length; i++) {
      let pat = this.patterns[(i + 2) % this.patterns.length];
      let chars: string[] = [];
      for (let j = 0; j < 120; j++) {
        chars.push(pat[j % pat.length]);
      }
      this.vStrips.push({
        x: this.w * vXs[i],
        chars,
        size: this.p.random([7, 8, 9]),
        color: [130, 130, 125]
      });
    }

    for (let i = 0; i < 8; i++) {
      this.frames.push({
        x: this.p.random(this.w * 0.05, this.w * 0.7),
        y: this.p.random(this.h * 0.05, this.h * 0.7),
        w: this.p.random(60, 250),
        h: this.p.random(40, 180),
        weight: this.p.random([0.5, 1, 1.5]),
        color: this.p.random() > 0.6 ? [60, 60, 220] : [160, 160, 155]
      });
    }

    for (let i = 0; i < 25; i++) {
      this.scatteredGroups.push({
        x: this.p.random(this.w),
        y: this.p.random(this.h),
        text: this.smallTexts[this.p.floor(this.p.random(this.smallTexts.length))],
        size: this.p.random(8, 16),
        color: this.p.random() > 0.7 ? [100, 240, 80] : [180, 180, 175]
      });
    }
  }

  update() {
    this.t += 0.003;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.textFont("monospace");
    g.noStroke();

    for (let s of this.hStrips) {
      g.fill(s.color[0], s.color[1], s.color[2], 180);
      g.textSize(s.size);
      if (s.bold) g.textStyle(this.p.BOLD);
      g.textAlign(this.p.LEFT, this.p.TOP);
      g.text(s.text, 0, s.y);
      g.textStyle(this.p.NORMAL);
    }

    for (let v of this.vStrips) {
      g.fill(v.color[0], v.color[1], v.color[2], 120);
      g.textSize(v.size);
      g.textAlign(this.p.CENTER, this.p.TOP);
      for (let i = 0; i < v.chars.length; i++) {
        g.text(v.chars[i], v.x, i * v.size);
      }
    }

    g.noFill();
    for (let f of this.frames) {
      g.stroke(f.color[0], f.color[1], f.color[2], 120);
      g.strokeWeight(f.weight);
      g.rect(f.x, f.y, f.w, f.h);
    }

    g.noStroke();
    for (let sg of this.scatteredGroups) {
      g.fill(sg.color[0], sg.color[1], sg.color[2], 180);
      g.textSize(sg.size);
      g.textAlign(this.p.LEFT, this.p.TOP);
      g.text(sg.text, sg.x, sg.y);
    }

    return g;
  }
}

export default CharBordersLayer;
