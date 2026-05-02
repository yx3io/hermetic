// @ts-nocheck
import type p5 from "p5";

class InterlockingLayer {
  w: number;
  h: number;
  p: p5;
  buf: any;
  bars: any[];
  t: number;

  constructor(w: number, h: number, p: p5) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.bars = [];
    this.t = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let cols = 3;
    let rows = 3;
    let zoneW = this.w / cols;
    let zoneH = this.h / rows;

    for (let zr = 0; zr < rows; zr++) {
      for (let zc = 0; zc < cols; zc++) {
        let cx = zc * zoneW + zoneW / 2;
        let cy = zr * zoneH + zoneH / 2;
        let count = this.p.floor(this.p.random(8, 18));

        for (let i = 0; i < count; i++) {
          let horizontal = this.p.random() > 0.45;
          let barW = horizontal ? this.p.random(25, 80) : this.p.random(2, 4);
          let barH = horizontal ? this.p.random(2, 4) : this.p.random(20, 60);
          let x = cx + this.p.random(-zoneW * 0.4, zoneW * 0.4);
          let y = cy + this.p.random(-zoneH * 0.4, zoneH * 0.4);

          this.bars.push({ x, y, w: barW, h: barH, horizontal, phase: this.p.random(this.p.TWO_PI) });
        }
      }
    }

    let patchPositions = [
      { x: this.w * 0.15, y: this.h * 0.2 },
      { x: this.w * 0.55, y: this.h * 0.65 },
      { x: this.w * 0.85, y: this.h * 0.4 },
    ];

    for (let pos of patchPositions) {
      let spacing = 8;
      let patchLen = this.p.floor(this.p.random(14, 24));
      for (let i = 0; i < patchLen; i++) {
        this.bars.push({
          x: pos.x + i * spacing,
          y: pos.y + (i % 2) * spacing,
          w: 2, h: 35,
          horizontal: false,
          phase: i * 0.3
        });
        if (i % 3 === 0) {
          this.bars.push({
            x: pos.x + i * spacing - 8,
            y: pos.y + 12 + (i % 2) * 5,
            w: 25, h: 2,
            horizontal: true,
            phase: i * 0.5
          });
        }
      }
    }
  }

  update() {
    this.t += 0.004;
  }

  render() {
    let g = this.buf;
    g.clear();

    g.noStroke();
    for (let bar of this.bars) {
      let drift = this.p.sin(this.t + bar.phase) * 1;
      let a = 140 + this.p.sin(this.t * 2 + bar.phase) * 40;
      g.fill(200, 200, 210, a);
      if (bar.horizontal) {
        g.rect(bar.x, bar.y + drift, bar.w, bar.h);
      } else {
        g.rect(bar.x + drift, bar.y, bar.w, bar.h);
      }
    }

    g.stroke(180, 180, 190, 60);
    g.strokeWeight(2);
    g.noFill();
    let cornerPositions = [
      { x: this.w * 0.1, y: this.h * 0.1 },
      { x: this.w * 0.9, y: this.h * 0.15 },
      { x: this.w * 0.3, y: this.h * 0.85 },
      { x: this.w * 0.7, y: this.h * 0.9 },
      { x: this.w * 0.5, y: this.h * 0.3 },
      { x: this.w * 0.8, y: this.h * 0.7 },
    ];
    for (let pos of cornerPositions) {
      let horizontal = this.p.random() > 0.5;
      let len = this.p.random(25, 55);
      if (horizontal) {
        g.line(pos.x, pos.y, pos.x + len, pos.y);
        g.arc(pos.x + len, pos.y, 10, 10, -this.p.HALF_PI, this.p.HALF_PI);
      } else {
        g.line(pos.x, pos.y, pos.x, pos.y + len);
        g.arc(pos.x, pos.y + len, 10, 10, 0, this.p.PI);
      }
    }

    return g;
  }
}

export default InterlockingLayer;
