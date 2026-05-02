// @ts-nocheck
import type p5 from "p5";

export default class SentenceDrawingLayer {
  w: number;
  h: number;
  p: p5;
  buf: any;
  t: number;
  rects: any[];
  scribbles: any[];
  gridClusters: any[];
  connectors: any[];
  dots: any[];
  arrows: any[];
  labels: any[];
  dashedLoops: any[];
  crosshatches: any[];
  labelTexts: string[];

  constructor(w: number, h: number, p: p5, labelTexts?: string[]) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.t = 0;
    this.rects = [];
    this.scribbles = [];
    this.gridClusters = [];
    this.connectors = [];
    this.dots = [];
    this.arrows = [];
    this.labels = [];
    this.dashedLoops = [];
    this.crosshatches = [];
    this.labelTexts = labelTexts || [
      "Act 1", "Act 2", "Act 3", "Act 4", "Act 5",
      "node_A", "cluster", "region", "boundary",
      "phase 1", "phase 2", "overlap", "merge",
      "density", "flow", "path", "sequence",
    ];
  }

  init() {
    const p = this.p;
    this.buf = p.createGraphics(this.w, this.h);
    (this.buf as any).pixelDensity(1);

    let palette = [
      [50, 50, 220],
      [100, 240, 80],
      [255, 200, 0],
      [240, 80, 130],
      [0, 0, 0],
      [180, 180, 175],
      [80, 80, 80],
      [120, 120, 120],
    ];

    this.rects = [];
    let clusterCount = p.floor(p.random(5, 9));
    for (let c = 0; c < clusterCount; c++) {
      let cx = p.random(this.w * 0.1, this.w * 0.9);
      let cy = p.random(this.h * 0.1, this.h * 0.9);
      let count = p.floor(p.random(15, 50));
      let clusterColor = palette[p.floor(p.random(palette.length))];
      for (let i = 0; i < count; i++) {
        let col = p.random() < 0.6 ? clusterColor : palette[p.floor(p.random(palette.length))];
        let rw = p.random(6, 80);
        let rh = p.random(6, 60);
        let filled = p.random() < 0.15;
        this.rects.push({
          x: cx + p.random(-120, 120),
          y: cy + p.random(-100, 100),
          w: rw, h: rh,
          color: col,
          weight: p.random(0.5, 2.5),
          alpha: p.random(80, 200),
          filled: filled,
          fillAlpha: p.random(20, 60),
          phase: p.random(p.TWO_PI),
          drift: p.random(0.05, 0.3),
        });
      }
    }

    for (let i = 0; i < 60; i++) {
      let col = palette[p.floor(p.random(palette.length))];
      let rw = p.random(5, 50);
      let rh = p.random(5, 40);
      this.rects.push({
        x: p.random(0, this.w),
        y: p.random(0, this.h),
        w: rw, h: rh,
        color: col,
        weight: p.random(0.4, 1.5),
        alpha: p.random(60, 160),
        filled: p.random() < 0.1,
        fillAlpha: p.random(15, 40),
        phase: p.random(p.TWO_PI),
        drift: p.random(0.03, 0.15),
      });
    }

    this.gridClusters = [];
    for (let i = 0; i < p.floor(p.random(4, 8)); i++) {
      let gx = p.random(20, this.w - 100);
      let gy = p.random(20, this.h - 100);
      let cols = p.floor(p.random(4, 12));
      let rows = p.floor(p.random(4, 10));
      let cellSize = p.random(6, 14);
      let color = p.random() < 0.5 ? [0, 0, 0] : palette[p.floor(p.random(palette.length))];
      this.gridClusters.push({
        x: gx, y: gy,
        cols: cols, rows: rows,
        cellSize: cellSize,
        color: color,
        alpha: p.random(40, 120),
        filled: p.random() < 0.5,
        phase: p.random(p.TWO_PI),
      });
    }

    this.scribbles = [];
    for (let i = 0; i < p.floor(p.random(5, 10)); i++) {
      let sx = p.random(30, this.w - 30);
      let sy = p.random(30, this.h - 30);
      let points: any[] = [];
      let px = sx, py = sy;
      let steps = p.floor(p.random(30, 120));
      for (let s = 0; s < steps; s++) {
        px += p.random(-12, 12);
        py += p.random(-12, 12);
        px = p.constrain(px, sx - 60, sx + 60);
        py = p.constrain(py, sy - 50, sy + 50);
        points.push({ x: px, y: py });
      }
      this.scribbles.push({
        points: points,
        color: [0, 0, 0],
        weight: p.random(0.4, 1.2),
        alpha: p.random(40, 100),
        phase: p.random(p.TWO_PI),
      });
    }

    this.dashedLoops = [];
    for (let i = 0; i < p.floor(p.random(4, 8)); i++) {
      let cx = p.random(50, this.w - 50);
      let cy = p.random(50, this.h - 50);
      let points: any[] = [];
      let steps = p.floor(p.random(20, 50));
      for (let s = 0; s <= steps; s++) {
        let angle = (s / steps) * p.TWO_PI;
        let r = p.random(30, 80) + p.noise(cx * 0.01 + p.cos(angle), cy * 0.01 + p.sin(angle)) * 40;
        points.push({ x: cx + p.cos(angle) * r, y: cy + p.sin(angle) * r });
      }
      this.dashedLoops.push({
        points: points,
        alpha: p.random(25, 60),
        weight: p.random(0.5, 1.5),
        phase: p.random(p.TWO_PI),
      });
    }

    this.connectors = [];
    for (let i = 0; i < 30; i++) {
      let a = this.rects[p.floor(p.random(this.rects.length))];
      let b = this.rects[p.floor(p.random(this.rects.length))];
      if (a === b) continue;
      let ax = a.x + a.w / 2, ay = a.y + a.h / 2;
      let bx = b.x + b.w / 2, by = b.y + b.h / 2;
      if (p.dist(ax, ay, bx, by) < 250) {
        let style = p.random() < 0.5 ? "right-angle" : "straight";
        this.connectors.push({
          x1: ax, y1: ay, x2: bx, y2: by,
          style: style,
          color: [60, 60, 65],
          weight: p.random(0.4, 1),
          alpha: p.random(30, 70),
          phase: p.random(p.TWO_PI),
        });
      }
    }

    this.crosshatches = [];
    for (let i = 0; i < p.floor(p.random(3, 6)); i++) {
      let cx = p.random(50, this.w - 100);
      let cy = p.random(50, this.h - 100);
      let cw = p.random(30, 100);
      let ch = p.random(30, 80);
      this.crosshatches.push({
        x: cx, y: cy, w: cw, h: ch,
        spacing: p.random(4, 8),
        color: palette[p.floor(p.random(palette.length))],
        alpha: p.random(30, 70),
        phase: p.random(p.TWO_PI),
      });
    }

    this.dots = [];
    for (let i = 0; i < 80; i++) {
      this.dots.push({
        x: p.random(0, this.w),
        y: p.random(0, this.h),
        size: p.random(2, 5),
        color: [0, 0, 0],
        alpha: p.random(30, 80),
        phase: p.random(p.TWO_PI),
      });
    }

    this.arrows = [];
    for (let i = 0; i < 8; i++) {
      let vertical = p.random() < 0.5;
      this.arrows.push({
        x: p.random(20, this.w - 20),
        y: p.random(20, this.h - 20),
        len: p.random(30, 80),
        vertical: vertical,
        alpha: p.random(40, 90),
        phase: p.random(p.TWO_PI),
      });
    }

    this.labels = [];
    for (let i = 0; i < 10; i++) {
      this.labels.push({
        text: "•" + this.labelTexts[p.floor(p.random(this.labelTexts.length))],
        x: p.random(30, this.w - 80),
        y: p.random(30, this.h - 20),
        size: p.random(8, 12),
        alpha: p.random(60, 140),
        phase: p.random(p.TWO_PI),
      });
    }
  }

  update() {
    this.t += 0.003;
  }

  render() {
    const p = this.p;
    let g = this.buf;
    g.background(255);

    for (let dl of this.dashedLoops) {
      let a = dl.alpha + 8 * p.sin(this.t + dl.phase);
      g.stroke(80, 80, 85, a);
      g.strokeWeight(dl.weight);
      g.noFill();
      for (let i = 0; i < dl.points.length - 1; i++) {
        if (i % 2 === 0) {
          g.line(dl.points[i].x, dl.points[i].y, dl.points[i + 1].x, dl.points[i + 1].y);
        }
      }
    }

    for (let sc of this.scribbles) {
      let a = sc.alpha + 8 * p.sin(this.t * 0.8 + sc.phase);
      g.stroke(sc.color[0], sc.color[1], sc.color[2], a);
      g.strokeWeight(sc.weight);
      g.noFill();
      g.beginShape();
      for (let pt of sc.points) g.vertex(pt.x, pt.y);
      g.endShape();
    }

    for (let gc of this.gridClusters) {
      let a = gc.alpha + 10 * p.sin(this.t * 0.6 + gc.phase);
      for (let r = 0; r < gc.rows; r++) {
        for (let c = 0; c < gc.cols; c++) {
          let px = gc.x + c * gc.cellSize;
          let py = gc.y + r * gc.cellSize;
          if (gc.filled && ((r + c) % 2 === 0 || p.random() < 0.3)) {
            g.noStroke();
            g.fill(gc.color[0], gc.color[1], gc.color[2], a);
            g.rect(px, py, gc.cellSize - 1, gc.cellSize - 1);
          } else {
            g.stroke(gc.color[0], gc.color[1], gc.color[2], a * 0.6);
            g.strokeWeight(0.5);
            g.noFill();
            g.rect(px, py, gc.cellSize - 1, gc.cellSize - 1);
          }
        }
      }
    }

    for (let ch of this.crosshatches) {
      let a = ch.alpha + 5 * p.sin(this.t + ch.phase);
      g.stroke(ch.color[0], ch.color[1], ch.color[2], a);
      g.strokeWeight(0.5);
      for (let x = ch.x; x < ch.x + ch.w; x += ch.spacing) {
        g.line(x, ch.y, x + ch.h * 0.5, ch.y + ch.h);
      }
      for (let x = ch.x; x < ch.x + ch.w; x += ch.spacing) {
        g.line(x + ch.h * 0.5, ch.y, x, ch.y + ch.h);
      }
    }

    for (let cn of this.connectors) {
      let a = cn.alpha + 6 * p.sin(this.t + cn.phase);
      g.stroke(cn.color[0], cn.color[1], cn.color[2], a);
      g.strokeWeight(cn.weight);
      g.noFill();
      if (cn.style === "right-angle") {
        let mx = cn.x2;
        g.line(cn.x1, cn.y1, mx, cn.y1);
        g.line(mx, cn.y1, cn.x2, cn.y2);
      } else {
        g.line(cn.x1, cn.y1, cn.x2, cn.y2);
      }
    }

    for (let r of this.rects) {
      let a = r.alpha;
      let dx = p.sin(this.t * r.drift + r.phase) * 1.5;
      let dy = p.cos(this.t * r.drift * 0.7 + r.phase) * 1;
      let rx = r.x + dx;
      let ry = r.y + dy;

      if (r.filled) {
        g.noStroke();
        g.fill(r.color[0], r.color[1], r.color[2], r.fillAlpha);
        g.rect(rx, ry, r.w, r.h);
      }
      g.stroke(r.color[0], r.color[1], r.color[2], a);
      g.strokeWeight(r.weight);
      g.noFill();
      g.rect(rx, ry, r.w, r.h);
    }

    for (let d of this.dots) {
      let a = d.alpha + 10 * p.sin(this.t + d.phase);
      g.noStroke();
      g.fill(d.color[0], d.color[1], d.color[2], a);
      g.ellipse(d.x, d.y, d.size, d.size);
    }

    for (let ar of this.arrows) {
      let a = ar.alpha + 8 * p.sin(this.t + ar.phase);
      g.stroke(60, 60, 65, a);
      g.strokeWeight(1);
      if (ar.vertical) {
        g.line(ar.x, ar.y, ar.x, ar.y + ar.len);
        g.line(ar.x, ar.y + ar.len, ar.x - 4, ar.y + ar.len - 8);
        g.line(ar.x, ar.y + ar.len, ar.x + 4, ar.y + ar.len - 8);
      } else {
        g.line(ar.x, ar.y, ar.x + ar.len, ar.y);
        g.line(ar.x, ar.y, ar.x + 8, ar.y - 4);
        g.line(ar.x, ar.y, ar.x + 8, ar.y + 4);
      }
    }

    for (let lb of this.labels) {
      let a = lb.alpha + 8 * p.sin(this.t * 0.6 + lb.phase);
      g.noStroke();
      g.fill(40, 40, 45, a);
      g.textFont("monospace");
      g.textSize(lb.size);
      g.textAlign(p.LEFT, p.TOP);
      g.text(lb.text, lb.x, lb.y);
    }

    return g;
  }
}
