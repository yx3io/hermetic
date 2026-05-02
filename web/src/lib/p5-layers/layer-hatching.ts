// @ts-nocheck
import type p5 from "p5";

interface HatchRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  spacing: number;
  weight: number;
  alpha: number;
}

interface ClippedLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

class HatchingLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  hatchRegions: HatchRegion[];
  t: number;

  constructor(w: number, h: number, p: p5) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.hatchRegions = [];
    this.t = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    this.hatchRegions = [
      { x: 0.5, y: 0, w: 0.5, h: 0.4, angle: 0.7, spacing: 2, weight: 0.5, alpha: 120 },
      { x: 0.3, y: 0.35, w: 0.7, h: 0.15, angle: 0, spacing: 1.5, weight: 0.4, alpha: 100 },
      { x: 0.55, y: 0.6, w: 0.45, h: 0.4, angle: 1.1, spacing: 2.5, weight: 0.6, alpha: 90 },
      { x: 0.3, y: 0.5, w: 0.25, h: 0.2, angle: -0.5, spacing: 3, weight: 0.4, alpha: 70 },
      { x: 0, y: 0.05, w: 0.4, h: 0.08, angle: 0, spacing: 1.2, weight: 0.3, alpha: 80 },
      { x: 0, y: 0.7, w: 0.35, h: 0.3, angle: 0.4, spacing: 3, weight: 0.5, alpha: 60 },
    ];
  }

  update() {
    this.t += 0.002;
  }

  render() {
    let g = this.buf!;
    g.clear();

    for (let hr of this.hatchRegions) {
      let rx = this.w * hr.x;
      let ry = this.h * hr.y;
      let rw = this.w * hr.w;
      let rh = this.h * hr.h;

      g.stroke(210, 210, 205, hr.alpha);
      g.strokeWeight(hr.weight);

      let ca = this.p.cos(hr.angle);
      let sa = this.p.sin(hr.angle);

      let diagLen = this.p.sqrt(rw * rw + rh * rh);
      let numLines = this.p.ceil(diagLen * 2 / hr.spacing);

      for (let i = -numLines; i < numLines; i++) {
        let offset = i * hr.spacing;

        let nx = -sa;
        let ny = ca;

        let cx = rx + rw / 2 + nx * offset;
        let cy = ry + rh / 2 + ny * offset;

        let x1 = cx - ca * diagLen;
        let y1 = cy - sa * diagLen;
        let x2 = cx + ca * diagLen;
        let y2 = cy + sa * diagLen;

        let clipped = this._clipLine(x1, y1, x2, y2, rx, ry, rx + rw, ry + rh);
        if (clipped) {
          g.line(clipped.x1, clipped.y1, clipped.x2, clipped.y2);
        }
      }
    }

    return g;
  }

  _clipLine(x1: number, y1: number, x2: number, y2: number, xmin: number, ymin: number, xmax: number, ymax: number): ClippedLine | null {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let tmin = 0, tmax = 1;

    let edges = [
      { p: -dx, q: x1 - xmin },
      { p: dx, q: xmax - x1 },
      { p: -dy, q: y1 - ymin },
      { p: dy, q: ymax - y1 }
    ];

    for (let e of edges) {
      if (Math.abs(e.p) < 0.0001) {
        if (e.q < 0) return null;
      } else {
        let t = e.q / e.p;
        if (e.p < 0) {
          tmin = Math.max(tmin, t);
        } else {
          tmax = Math.min(tmax, t);
        }
      }
    }

    if (tmin > tmax) return null;

    return {
      x1: x1 + dx * tmin,
      y1: y1 + dy * tmin,
      x2: x1 + dx * tmax,
      y2: y1 + dy * tmax
    };
  }
}

export default HatchingLayer;
