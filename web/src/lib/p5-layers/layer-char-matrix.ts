// @ts-nocheck
import type p5 from "p5";

interface Region {
  x: number;
  y: number;
  lines: string[];
  charSize: number;
  color: number[];
}

interface Strip {
  y: number;
  text: string;
  size: number;
  color: number[];
}

class CharMatrixLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  regions: Region[];
  strips: Strip[];
  t: number;
  private charSets: string[];

  constructor(
    w: number,
    h: number,
    p: p5,
    charSets: string[] = [
      "01jJ5",
      "+8C(<)",
      "n8mM0",
      "0123456789",
      "+-(){}[]<>",
      "8nn8n88n",
    ]
  ) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.regions = [];
    this.strips = [];
    this.t = 0;
    this.charSets = charSets;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let charSets = this.charSets;

    let regionDefs = [
      { x: 0, y: 0, w: 1.0, h: 0.06, charSize: 7, chars: charSets[0], density: 0.95, color: [200, 200, 195] },
      { x: 0, y: 0.88, w: 1.0, h: 0.12, charSize: 11, chars: charSets[0], density: 0.98, color: [220, 220, 215] },
      { x: 0, y: 0.07, w: 0.35, h: 0.1, charSize: 8, chars: charSets[3], density: 0.9, color: [180, 180, 180] },
      { x: 0.05, y: 0.35, w: 0.2, h: 0.15, charSize: 9, chars: charSets[1], density: 0.85, color: [60, 60, 220] },
      { x: 0.4, y: 0.02, w: 0.35, h: 0.35, charSize: 10, chars: charSets[1], density: 0.92, color: [50, 50, 200] },
      { x: 0.25, y: 0.5, w: 0.15, h: 0.08, charSize: 7, chars: charSets[4], density: 0.8, color: [180, 180, 180] },
      { x: 0.6, y: 0.55, w: 0.2, h: 0.1, charSize: 8, chars: charSets[2], density: 0.88, color: [100, 240, 80] },
      { x: 0.8, y: 0.3, w: 0.18, h: 0.12, charSize: 7, chars: charSets[5], density: 0.9, color: [170, 170, 170] },
    ];

    for (let def of regionDefs) {
      let lines: string[] = [];
      let cols = this.p.floor((this.w * def.w) / (def.charSize * 0.65));
      let rows = this.p.floor((this.h * def.h) / def.charSize);
      for (let r = 0; r < rows; r++) {
        let line = "";
        for (let c = 0; c < cols; c++) {
          if (this.p.random() < def.density) {
            line += def.chars[this.p.floor(this.p.random(def.chars.length))];
          } else {
            line += " ";
          }
        }
        lines.push(line);
      }
      this.regions.push({
        x: this.w * def.x,
        y: this.h * def.y,
        lines,
        charSize: def.charSize,
        color: def.color,
      });
    }

    let stripChars = ["(+(8++(88(+(+8(8(((8+++8", "8nn8n88nn8n88n8nn8n88n8n", "0jJ50j10jJ50j10jJ50j1"];
    let stripYs = [0.06, 0.35, 0.65, 0.87];
    for (let i = 0; i < stripYs.length; i++) {
      let pattern = stripChars[i % stripChars.length];
      let fullLine = "";
      while (fullLine.length < 200) fullLine += pattern;
      this.strips.push({
        y: this.h * stripYs[i],
        text: fullLine,
        size: this.p.random(8, 12),
        color: this.p.random() > 0.5 ? [180, 180, 175] : [80, 80, 80],
      });
    }
  }

  update() {
    this.t += 0.004;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.textFont("monospace");
    g.noStroke();

    for (let reg of this.regions) {
      g.fill(reg.color[0], reg.color[1], reg.color[2], 200);
      g.textSize(reg.charSize);
      g.textAlign(this.p.LEFT, this.p.TOP);
      for (let r = 0; r < reg.lines.length; r++) {
        g.text(reg.lines[r], reg.x, reg.y + r * reg.charSize);
      }
    }

    for (let s of this.strips) {
      g.fill(s.color[0], s.color[1], s.color[2], 160);
      g.textSize(s.size);
      g.textAlign(this.p.LEFT, this.p.TOP);
      g.text(s.text, 0, s.y);
    }

    return g;
  }
}

export default CharMatrixLayer;
