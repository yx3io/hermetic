// @ts-nocheck
import type p5 from "p5";

interface CheckerDef {
  x: number;
  y: number;
  w: number;
  h: number;
  cellSize: number;
  c1: number[];
  c2: number[];
  alpha: number;
}

interface SolidBlock {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number[];
  alpha: number;
}

class CheckerFillLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  checkers: CheckerDef[];
  solidBlocks: SolidBlock[];
  t: number;

  constructor(w: number, h: number, p: p5) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.checkers = [];
    this.solidBlocks = [];
    this.t = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    this.checkers = [
      { x: 0.22, y: 0.0, w: 0.08, h: 0.85, cellSize: 8, c1: [100, 240, 80], c2: [30, 80, 20], alpha: 200 },
      { x: 0.4, y: 0.0, w: 0.5, h: 0.45, cellSize: 14, c1: [50, 50, 220], c2: [20, 20, 100], alpha: 180 },
      { x: 0.6, y: 0.55, w: 0.15, h: 0.15, cellSize: 10, c1: [180, 180, 175], c2: [60, 60, 60], alpha: 160 },
      { x: 0.15, y: 0.85, w: 0.12, h: 0.15, cellSize: 6, c1: [90, 220, 60], c2: [20, 60, 15], alpha: 180 },
    ];

    for (let i = 0; i < 15; i++) {
      let isBlue = this.p.random() > 0.5;
      this.solidBlocks.push({
        x: this.p.random(this.w),
        y: this.p.random(this.h),
        w: this.p.random(10, 80),
        h: this.p.random(5, 40),
        color: isBlue ? [50, 50, 220] : [100, 240, 80],
        alpha: this.p.random(100, 200)
      });
    }
  }

  update() {
    this.t += 0.003;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.noStroke();

    for (let ch of this.checkers) {
      let rx = this.w * ch.x;
      let ry = this.h * ch.y;
      let rw = this.w * ch.w;
      let rh = this.h * ch.h;
      let cols = this.p.ceil(rw / ch.cellSize);
      let rows = this.p.ceil(rh / ch.cellSize);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let isEven = (r + c) % 2 === 0;
          let col = isEven ? ch.c1 : ch.c2;
          g.fill(col[0], col[1], col[2], ch.alpha);
          let px = rx + c * ch.cellSize;
          let py = ry + r * ch.cellSize;
          if (px < rx + rw && py < ry + rh) {
            g.rect(px, py, ch.cellSize, ch.cellSize);
          }
        }
      }
    }

    for (let sb of this.solidBlocks) {
      g.fill(sb.color[0], sb.color[1], sb.color[2], sb.alpha);
      g.rect(sb.x, sb.y, sb.w, sb.h);
    }

    return g;
  }
}

export default CheckerFillLayer;
