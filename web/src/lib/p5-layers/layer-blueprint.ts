// @ts-nocheck
import type p5 from "p5";

class BlueprintLayer {
  w: number;
  h: number;
  p: p5;
  buf: any;
  symbols: any[];
  labels: any[];
  t: number;

  constructor(
    w: number,
    h: number,
    p: p5,
    private sectionLabels: string[] = [
      "Sonic Waves", "Photon Mapping", "Mutation",
      "Mechanical Resonance", "Light Waves", "Divergent A.I.volution",
      "Adaptation", "Genetic Drift", "Hybridization",
      "Non-Human Entities", "Archivist", "Human Beings"
    ]
  ) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.symbols = [];
    this.labels = [];
    this.t = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let cx = this.w / 2;
    let cy = this.h / 2;

    this.symbols.push({ type: "spiral", x: cx, y: cy - 40, r: 50 });

    for (let i = 0; i < 5; i++) {
      let ex = cx - 100 + i * 50;
      this.symbols.push({
        type: "ellipse",
        x: ex, y: cy - 120,
        w: 40 + i * 5, h: 15
      });
    }

    for (let x = 40; x < this.w - 20; x += 30) {
      this.symbols.push({ type: "cross", x, y: 30, s: 6 });
      this.symbols.push({ type: "cross", x, y: this.h - 30, s: 6 });
    }
    for (let y = 60; y < this.h - 40; y += 30) {
      this.symbols.push({ type: "cross", x: 30, y, s: 6 });
      this.symbols.push({ type: "cross", x: this.w - 30, y, s: 6 });
    }

    this.symbols.push({ type: "hexagon", x: cx, y: cy + 100, r: 40 });
    this.symbols.push({ type: "hexagon", x: cx, y: cy + 150, r: 55 });
    this.symbols.push({ type: "hexagon", x: cx, y: cy + 195, r: 70 });

    this.symbols.push({ type: "wave", x: cx - 80, y: cy + 60, w: 160, amp: 10 });

    for (let i = 0; i < 6; i++) {
      let a = (i / 6) * this.p.TWO_PI - this.p.HALF_PI;
      let r = 70;
      this.symbols.push({
        type: "circle",
        x: cx + this.p.cos(a) * r,
        y: 140 + this.p.sin(a) * r,
        r: this.p.random(15, 30)
      });
    }

    this.symbols.push({ type: "arc", x: cx, y: 140, r: 70 });

    for (let i = 0; i < 8; i++) {
      this.labels.push({
        x: this.p.random(60, this.w - 120),
        y: this.p.random(60, this.h - 60),
        text: this.p.random(this.sectionLabels),
        vertical: this.p.random() > 0.7
      });
    }
  }

  update() {
    this.t += 0.005;
  }

  render() {
    let g = this.buf;
    g.clear();

    let col = [50, 50, 220];

    for (let sym of this.symbols) {
      g.stroke(col[0], col[1], col[2], 100);
      g.strokeWeight(1);
      g.noFill();

      switch (sym.type) {
        case "cross":
          g.line(sym.x - sym.s, sym.y, sym.x + sym.s, sym.y);
          g.line(sym.x, sym.y - sym.s, sym.x, sym.y + sym.s);
          break;

        case "circle":
          g.ellipse(sym.x, sym.y, sym.r * 2);
          g.fill(col[0], col[1], col[2], 80);
          g.noStroke();
          g.ellipse(sym.x, sym.y, 4);
          break;

        case "ellipse":
          g.ellipse(sym.x, sym.y, sym.w, sym.h);
          break;

        case "hexagon":
          g.beginShape();
          for (let i = 0; i < 6; i++) {
            let a = (i / 6) * this.p.TWO_PI - this.p.HALF_PI;
            g.vertex(sym.x + this.p.cos(a) * sym.r, sym.y + this.p.sin(a) * sym.r * 0.6);
          }
          g.endShape(this.p.CLOSE);
          break;

        case "spiral":
          g.noFill();
          g.beginShape();
          for (let a = 0; a < this.p.TWO_PI * 3; a += 0.1) {
            let r = (a / (this.p.TWO_PI * 3)) * sym.r;
            g.vertex(sym.x + this.p.cos(a + this.t) * r, sym.y + this.p.sin(a + this.t) * r);
          }
          g.endShape();
          break;

        case "wave":
          g.beginShape();
          for (let i = 0; i < sym.w; i += 2) {
            let yy = sym.y + this.p.sin(i * 0.08 + this.t * 2) * sym.amp;
            g.vertex(sym.x + i, yy);
          }
          g.endShape();
          break;

        case "arc":
          g.arc(sym.x, sym.y, sym.r * 2, sym.r * 2, 0, this.p.PI);
          break;
      }
    }

    g.textFont("monospace");
    g.noStroke();
    g.textSize(8);
    g.fill(col[0], col[1], col[2], 120);
    for (let l of this.labels) {
      g.push();
      g.translate(l.x, l.y);
      if (l.vertical) g.rotate(-this.p.HALF_PI);
      g.textAlign(this.p.CENTER, this.p.CENTER);
      g.text(l.text, 0, 0);
      g.pop();
    }

    g.fill(50, 50, 220, 60);
    g.noStroke();
    for (let i = 0; i < 10; i++) {
      let tx = this.p.random(this.w);
      let ty = this.p.random(this.h);
      g.triangle(tx, ty - 4, tx - 4, ty + 3, tx + 4, ty + 3);
    }

    return g;
  }
}

export default BlueprintLayer;
