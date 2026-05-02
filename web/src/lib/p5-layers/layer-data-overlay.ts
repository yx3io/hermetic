// @ts-nocheck
import type p5 from "p5";

class DataOverlayLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  scanLineOffset: number;
  binaryStreams: any[];
  hexBlocks: any[];
  t: number;

  constructor(w: number, h: number, p: p5) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.scanLineOffset = 0;
    this.binaryStreams = [];
    this.hexBlocks = [];
    this.t = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let cols = 5;
    let rows = 4;
    let cellW = this.w / cols;
    let cellH = this.h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.p.random() > 0.35) {
          let chars = [];
          let len = this.p.floor(this.p.random(20, 60));
          for (let j = 0; j < len; j++) {
            chars.push(this.p.random() > 0.5 ? "1" : "0");
          }
          let vertical = this.p.random() > 0.5;
          this.binaryStreams.push({
            x: c * cellW + this.p.random(10, cellW - 10),
            y: r * cellH + this.p.random(10, cellH - 10),
            chars: chars.join(""),
            size: this.p.random(7, 11),
            alpha: this.p.random(40, 100),
            vertical
          });
        }
      }
    }

    for (let i = 0; i < 12; i++) {
      let angle = (i / 12) * this.p.TWO_PI;
      let radius = this.p.random(this.w * 0.15, this.w * 0.4);
      this.hexBlocks.push({
        x: this.w / 2 + this.p.cos(angle) * radius + this.p.random(-40, 40),
        y: this.h / 2 + this.p.sin(angle) * radius + this.p.random(-40, 40),
        lines: this.p.floor(this.p.random(3, 8))
      });
    }
  }

  update() {
    this.scanLineOffset += 0.8;
    if (this.scanLineOffset > 4) this.scanLineOffset = 0;
    this.t++;
  }

  render() {
    let g = this.buf!;
    g.clear();

    g.textFont("monospace");
    g.noStroke();

    for (let bs of this.binaryStreams) {
      g.fill(100, 240, 80, bs.alpha);
      g.textSize(bs.size);
      if (bs.vertical) {
        for (let i = 0; i < bs.chars.length; i++) {
          g.text(bs.chars[i], bs.x, bs.y + i * (bs.size + 1));
        }
      } else {
        g.text(bs.chars, bs.x, bs.y);
      }
    }

    g.fill(100, 240, 80, 40);
    g.textSize(7);
    for (let hb of this.hexBlocks) {
      for (let i = 0; i < hb.lines; i++) {
        let addr = (50000 + this.p.floor(this.p.random(5000))).toString(16).toUpperCase();
        let hex = "";
        for (let j = 0; j < 6; j++) {
          hex += " " + this.p.floor(this.p.random(0xFFFF)).toString(16).toUpperCase().padStart(4, '0');
        }
        g.text(addr + hex, hb.x, hb.y + i * 9);
      }
    }

    g.stroke(255, 255, 255, 10);
    g.strokeWeight(1);
    for (let y = this.scanLineOffset; y < this.h; y += 3) {
      g.line(0, y, this.w, y);
    }

    if (this.t % 120 < 3) {
      let glitchY = this.p.random(this.h);
      let glitchH = this.p.random(2, 20);
      g.fill(255, 255, 255, this.p.random(10, 40));
      g.noStroke();
      g.rect(0, glitchY, this.w, glitchH);
    }

    let gradient = g.drawingContext;
    let radGrad = gradient.createRadialGradient(
      this.w / 2, this.h / 2, this.w * 0.25,
      this.w / 2, this.h / 2, this.w * 0.7
    );
    radGrad.addColorStop(0, "rgba(0,0,0,0)");
    radGrad.addColorStop(1, "rgba(0,0,0,0.5)");
    gradient.fillStyle = radGrad;
    gradient.fillRect(0, 0, this.w, this.h);

    return g;
  }
}

export default DataOverlayLayer;
