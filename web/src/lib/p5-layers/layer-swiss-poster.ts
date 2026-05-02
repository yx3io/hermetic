// @ts-nocheck
import type p5 from "p5";

class SwissPosterLayer {
  w: number;
  h: number;
  p: p5;
  buf: any;
  labels: any[];
  connectors: any[];
  brackets: any[];
  figLabels: any[];
  t: number;

  constructor(
    w: number,
    h: number,
    p: p5,
    private words: string[] = [
      "SOUNDWALK", "CARING FOR THE HUM", "URBAN LANDSCAPE",
      "START", "OBJECT,", "VISUAL", "PHOTO", "ARCHIVE",
      "SPACE", "CREAT", "FIG.", "PROXIMITY", "DISTANCE",
      "RESONANCE", "ADAPTATION", "MUTATION", "DRIFT",
      "[40']", "INTERLINKED.", "WITHIN CELLS",
      "VERNISSAGE", "FINISSAGE", "LOCATION", "SUPPORT"
    ],
    private bracketTexts: string[] = [
      "[04.01.21]", "[17:30]", "(START)", "[RINDERMARKT 23]",
      "[CELLS]", "(NODE)", "[ECHO]", "[21:00]"
    ]
  ) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.labels = [];
    this.connectors = [];
    this.brackets = [];
    this.figLabels = [];
    this.t = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    for (let i = 0; i < 14; i++) {
      this.labels.push({
        x: this.p.random(30, this.w - 80),
        y: this.p.random(30, this.h - 30),
        text: this.p.random(this.words),
        size: this.p.random() > 0.7 ? this.p.random(18, 36) : this.p.random(9, 14),
        spaced: this.p.random() > 0.6
      });
    }

    for (let i = 0; i < 8; i++) {
      let x1 = this.p.random(this.w);
      let y1 = this.p.random(this.h);
      let horizontal = this.p.random() > 0.5;
      let len = this.p.random(30, 200);
      this.connectors.push({
        x1, y1,
        x2: horizontal ? x1 + len : x1,
        y2: horizontal ? y1 : y1 + len,
        hasEndDot: this.p.random() > 0.5,
        hasStartTick: this.p.random() > 0.4
      });
    }

    for (let i = 0; i < 5; i++) {
      this.brackets.push({
        x: this.p.random(40, this.w - 160),
        y: this.p.random(60, this.h - 60),
        text: this.p.random(this.bracketTexts),
        size: this.p.random(14, 32)
      });
    }

    this.figLabels.push({ x: 30, y: 40, num: "01" });
    this.figLabels.push({ x: this.w - 100, y: 30, sub: "PHOTO ARCHIVE\nCREAT, OBJECT, VISUAL SPACE" });
  }

  update() {
    this.t += 0.003;
  }

  render() {
    let g = this.buf;
    g.clear();

    g.stroke(180, 180, 180, 80);
    g.strokeWeight(0.7);
    for (let c of this.connectors) {
      g.line(c.x1, c.y1, c.x2, c.y2);
      if (c.hasEndDot) {
        g.fill(180, 180, 180, 120);
        g.noStroke();
        g.ellipse(c.x2, c.y2, 4);
        g.stroke(180, 180, 180, 80);
        g.strokeWeight(0.7);
      }
      if (c.hasStartTick) {
        let perpX = -(c.y2 - c.y1);
        let perpY = c.x2 - c.x1;
        let len = this.p.sqrt(perpX * perpX + perpY * perpY);
        if (len > 0) {
          perpX = perpX / len * 4;
          perpY = perpY / len * 4;
          g.line(c.x1 - perpX, c.y1 - perpY, c.x1 + perpX, c.y1 + perpY);
        }
      }
    }

    g.textFont("monospace");
    g.noStroke();
    for (let l of this.labels) {
      let a = 160 + this.p.sin(this.t * 2 + l.x * 0.01) * 40;
      g.fill(210, 210, 210, a);
      g.textSize(l.size);
      g.textAlign(this.p.LEFT, this.p.TOP);
      if (l.spaced) {
        let spaced = l.text.split("").join("  ");
        g.text(spaced, l.x, l.y);
      } else {
        g.text(l.text, l.x, l.y);
      }
    }

    for (let b of this.brackets) {
      g.fill(220, 220, 230, 160);
      g.textSize(b.size);
      g.textAlign(this.p.CENTER, this.p.CENTER);
      g.text(b.text, b.x, b.y);
    }

    g.textAlign(this.p.LEFT, this.p.TOP);
    for (let f of this.figLabels) {
      if (f.num) {
        g.fill(200, 200, 200, 100);
        g.textSize(32);
        g.text("FIG.", f.x, f.y);
        g.textSize(28);
        g.text(f.num, f.x, f.y + 36);
      }
      if (f.sub) {
        g.fill(180, 180, 180, 80);
        g.textSize(8);
        g.text(f.sub, f.x || this.w - 180, f.y || 30);
      }
    }

    g.stroke(150, 150, 150, 60);
    g.strokeWeight(0.5);
    for (let i = 0; i < 12; i++) {
      let mx = this.p.random(this.w);
      let my = this.p.random(this.h);
      let markSize = 4;
      g.line(mx - markSize, my, mx + markSize, my);
      g.line(mx, my - markSize, mx, my + markSize);
    }

    return g;
  }
}

export default SwissPosterLayer;
