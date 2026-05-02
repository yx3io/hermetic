// @ts-nocheck
import type p5 from "p5";

// Layer: Contour Shapes — topographic contour blobs + abstract overlapping outlines
// Organic noise-driven closed curves with elevation labels, grid overlay, compass

class ContourShapesLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  contours: any[];
  blobs: any[];
  gridRect: any;
  labels: any[];
  t: number;
  seed: number;

  constructor(w: number, h: number, p: p5) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.contours = [];
    this.blobs = [];
    this.gridRect = null;
    this.labels = [];
    this.t = 0;
    this.seed = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);
    this.seed = this.p.random(1000);

    let w = this.w, h = this.h;

    // --- Generate contour islands using noise field ---
    let noiseScale = 0.006;
    let levels = [20, 40, 60, 80, 100, 120];

    // Place several noise "peaks" that create contour islands
    let peaks: any[] = [];
    for (let i = 0; i < this.p.floor(this.p.random(8, 16)); i++) {
      peaks.push({
        x: this.p.random(w * 0.05, w * 0.95),
        y: this.p.random(h * 0.05, h * 0.95),
        strength: this.p.random(60, 140),
        radius: this.p.random(40, 150),
      });
    }

    // For each level, trace contour blobs around peaks
    for (let level of levels) {
      for (let pk of peaks) {
        if (pk.strength < level) continue;
        let numRings = this.p.floor((pk.strength - level) / 25) + 1;
        for (let ring = 0; ring < this.p.min(numRings, 3); ring++) {
          let r = pk.radius * (1 - level / pk.strength) * (1 - ring * 0.25);
          if (r < 8) continue;
          let pts = this._makeBlob(pk.x, pk.y, r, 30 + this.p.floor(this.p.random(20)));
          this.contours.push({ pts, level, peak: pk });
        }
      }
    }

    // --- Large abstract overlapping blob outlines ---
    for (let i = 0; i < this.p.floor(this.p.random(5, 10)); i++) {
      let cx = this.p.random(w * 0.1, w * 0.9);
      let cy = this.p.random(h * 0.15, h * 0.85);
      let r = this.p.random(60, 250);
      let pts = this._makeBlob(cx, cy, r, 40 + this.p.floor(this.p.random(30)), 0.4 + this.p.random(0.6));
      this.blobs.push({ pts, weight: this.p.random() < 0.3 ? this.p.random(1.5, 2.5) : this.p.random(0.6, 1.2) });
    }

    // --- Rectangular grid overlay ---
    let gw = this.p.random(w * 0.2, w * 0.35);
    let gh = this.p.random(h * 0.12, h * 0.22);
    let gx = this.p.random(w * 0.15, w * 0.55);
    let gy = this.p.random(h * 0.2, h * 0.5);
    let angle = this.p.random(-0.15, 0.15);
    this.gridRect = { x: gx, y: gy, w: gw, h: gh, angle, cols: this.p.floor(this.p.random(3, 6)), rows: this.p.floor(this.p.random(2, 4)) };

    // --- Labels ---
    this.labels.push({ text: "IOCUS POSTERS    01", x: w * 0.05, y: h * 0.02, size: 9 });
    this.labels.push({ text: "JAN-FEB 2025", x: w * 0.75, y: h * 0.02, size: 9 });
    this.labels.push({ text: "EXPERIMENTATION [n.]", x: w * 0.05, y: h * 0.97, size: 8 });
    this.labels.push({ text: "«SHAPES»", x: w * 0.45, y: h * 0.97, size: 8 });
    this.labels.push({ text: "FIG." + this.p.floor(this.p.random(1, 9)), x: w * 0.82, y: h * 0.97, size: 8 });
    this.labels.push({ text: "EXCAVATION", x: gx + gw + 10, y: gy + gh * 0.6, size: 9 });

    // Scale bar at bottom left
    this.labels.push({ text: "0", x: w * 0.05, y: h * 0.92, size: 7 });
    this.labels.push({ text: "10", x: w * 0.05 + 40, y: h * 0.92, size: 7 });
    this.labels.push({ text: "20 M.", x: w * 0.05 + 80, y: h * 0.92, size: 7 });
  }

  _makeBlob(cx: number, cy: number, radius: number, numPts: number, wobble?: number) {
    if (!wobble) wobble = 0.5;
    let pts: { x: number; y: number }[] = [];
    let seed = this.p.random(1000);
    for (let i = 0; i < numPts; i++) {
      let angle = (i / numPts) * this.p.TWO_PI;
      let n = this.p.noise(seed + this.p.cos(angle) * 2, this.p.sin(angle) * 2);
      let r = radius * (0.6 + n * wobble * 1.5);
      // Add organic irregularity
      r += this.p.sin(angle * 3 + seed) * radius * 0.1;
      r += this.p.cos(angle * 5 + seed * 2) * radius * 0.06;
      pts.push({ x: cx + this.p.cos(angle) * r, y: cy + this.p.sin(angle) * r });
    }
    return pts;
  }

  update() {
    this.t += 0.002;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.background(255);

    // --- Draw contour lines ---
    for (let c of this.contours) {
      g.noFill();
      g.stroke(30, 30, 30);
      g.strokeWeight(0.7);

      g.beginShape();
      for (let p of c.pts) {
        g.curveVertex(p.x, p.y);
      }
      // Close the curve
      g.curveVertex(c.pts[0].x, c.pts[0].y);
      g.curveVertex(c.pts[1].x, c.pts[1].y);
      g.curveVertex(c.pts[2].x, c.pts[2].y);
      g.endShape();

      // Elevation label on one point
      let labelIdx = this.p.floor(c.pts.length * 0.25);
      let lp = c.pts[labelIdx];
      if (lp.x > 10 && lp.x < this.w - 30 && lp.y > 10 && lp.y < this.h - 10) {
        g.noStroke();
        g.fill(30);
        g.textFont("monospace");
        g.textSize(7);
        g.textAlign(this.p.LEFT, this.p.CENTER);
        g.text(c.level, lp.x + 2, lp.y);
      }
    }

    // --- Draw abstract blob outlines ---
    for (let b of this.blobs) {
      g.noFill();
      g.stroke(30, 30, 30);
      g.strokeWeight(b.weight);

      g.beginShape();
      for (let p of b.pts) {
        let dx = this.p.sin(this.t + p.x * 0.01) * 1.5;
        let dy = this.p.cos(this.t * 0.8 + p.y * 0.01) * 1;
        g.curveVertex(p.x + dx, p.y + dy);
      }
      g.curveVertex(b.pts[0].x, b.pts[0].y);
      g.curveVertex(b.pts[1].x, b.pts[1].y);
      g.curveVertex(b.pts[2].x, b.pts[2].y);
      g.endShape();
    }

    // --- Draw grid rectangle ---
    if (this.gridRect) {
      let gr = this.gridRect;
      g.push();
      g.translate(gr.x + gr.w / 2, gr.y + gr.h / 2);
      g.rotate(gr.angle);
      g.noFill();
      g.stroke(30);
      g.strokeWeight(0.5);
      g.rect(-gr.w / 2, -gr.h / 2, gr.w, gr.h);

      // Grid subdivisions
      for (let c = 1; c < gr.cols; c++) {
        let x = -gr.w / 2 + (gr.w / gr.cols) * c;
        g.line(x, -gr.h / 2, x, gr.h / 2);
      }
      for (let r = 1; r < gr.rows; r++) {
        let y = -gr.h / 2 + (gr.h / gr.rows) * r;
        g.line(-gr.w / 2, y, gr.w / 2, y);
      }
      g.pop();

      // Arrow pointing to grid
      let ax = gr.x + gr.w + 5;
      let ay = gr.y + gr.h * 0.5;
      g.stroke(30);
      g.strokeWeight(0.7);
      g.line(ax, ay, ax + 30, ay + 15);
    }

    // --- Compass arrow ---
    let compassX = this.w * 0.3;
    let compassY = this.h * 0.88;
    g.stroke(30);
    g.strokeWeight(1);
    g.line(compassX, compassY, compassX + 50, compassY);
    g.line(compassX + 50, compassY, compassX + 44, compassY - 4);
    g.line(compassX + 50, compassY, compassX + 44, compassY + 4);
    g.noStroke();
    g.fill(30);
    g.textFont("monospace");
    g.textSize(10);
    g.textAlign(this.p.LEFT, this.p.CENTER);
    g.text("N", compassX + 55, compassY);

    // --- Scale bar ---
    let sbx = this.w * 0.05;
    let sby = this.h * 0.91;
    g.stroke(30);
    g.strokeWeight(1);
    g.line(sbx, sby, sbx + 90, sby);
    // Alternating black/white sections
    for (let i = 0; i < 4; i++) {
      let sx = sbx + i * 22.5;
      if (i % 2 === 0) {
        g.fill(30);
      } else {
        g.fill(252, 250, 245);
      }
      g.stroke(30);
      g.strokeWeight(0.5);
      g.rect(sx, sby - 4, 22.5, 8);
    }

    // --- Labels ---
    g.noStroke();
    g.fill(30);
    g.textFont("monospace");
    for (let lb of this.labels) {
      g.textSize(lb.size);
      g.textAlign(this.p.LEFT, this.p.TOP);
      g.text(lb.text, lb.x, lb.y);
    }

    return g;
  }
}

export default ContourShapesLayer;
