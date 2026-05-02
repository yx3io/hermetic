// @ts-nocheck
import type p5 from "p5";

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  bg: number[];
  fg: number[];
  ch: string;
  fontSize: number;
  mode: string;
  phase: number;
  cr: number;
}

class ColorGridLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  blocks: Block[];
  t: number;
  private chars: string;
  private palette: number[][];

  constructor(
    w: number,
    h: number,
    p: p5,
    chars: string = "MESXOD6905*2",
    palette: number[][] = [
      [50, 50, 220],
      [100, 240, 80],
      [255, 200, 0],
      [240, 80, 130],
      [255, 255, 255],
      [0, 0, 0],
      [180, 180, 175],
      [80, 80, 80],
      [120, 120, 120],
    ]
  ) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.blocks = [];
    this.t = 0;
    this.chars = chars;
    this.palette = palette;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let palette = this.palette;
    let chars = this.chars;

    this._hGridPass(0, 0, this.w, this.h, 80, 40, palette, chars, 12);
    this._vGridPass(0, 0, this.w, this.h, 35, 80, palette, chars, 12);
    this._hGridPass(this.p.random(-20, 20), this.p.random(-15, 15), this.w + 40, this.h + 30, 55, 28, palette, chars, 11);
    this._vGridPass(this.p.random(-10, 10), this.p.random(-8, 8), this.w + 20, this.h + 16, 28, 55, palette, chars, 11);
    this._hGridPass(this.p.random(-10, 10), this.p.random(-8, 8), this.w + 20, this.h + 16, 35, 18, palette, chars, 9);
    this._vGridPass(this.p.random(-8, 8), this.p.random(-5, 5), this.w + 16, this.h + 10, 18, 35, palette, chars, 9);

    for (let i = 0; i < 30; i++) {
      let vertical = this.p.random() < 0.5;
      let bw, bh;
      if (vertical) {
        bw = this.p.random(15, 45);
        bh = this.p.random(60, 250);
      } else {
        bw = this.p.random(60, 250);
        bh = this.p.random(15, 45);
      }
      this._addBlock(
        this.p.random(-5, this.w - bw * 0.3),
        this.p.random(-5, this.h - bh * 0.3),
        bw, bh, palette, chars, this.p.random() < 0.5 ? 13 : 10
      );
    }
  }

  _hGridPass(startX: number, startY: number, totalW: number, totalH: number, avgW: number, avgH: number, palette: number[][], chars: string, baseFontSize: number) {
    let y = startY;
    while (y < startY + totalH) {
      let rh = this.p.floor(avgH * this.p.random(0.6, 2.5));
      rh = this.p.max(rh, 12);
      let x = startX;
      while (x < startX + totalW) {
        let widthMult = this.p.random() < 0.15 ? this.p.random(3, 7) : this.p.random(0.5, 2.5);
        let cw = this.p.floor(avgW * widthMult);
        cw = this.p.max(cw, 15);
        this._addBlock(x, y, cw, rh, palette, chars, baseFontSize);
        x += cw;
      }
      y += rh;
    }
  }

  _vGridPass(startX: number, startY: number, totalW: number, totalH: number, avgW: number, avgH: number, palette: number[][], chars: string, baseFontSize: number) {
    let x = startX;
    while (x < startX + totalW) {
      let cw = this.p.floor(avgW * this.p.random(0.5, 2.5));
      cw = this.p.max(cw, 12);
      let y = startY;
      while (y < startY + totalH) {
        let heightMult = this.p.random() < 0.15 ? this.p.random(3, 7) : this.p.random(0.5, 2.5);
        let rh = this.p.floor(avgH * heightMult);
        rh = this.p.max(rh, 12);
        this._addBlock(x, y, cw, rh, palette, chars, baseFontSize);
        y += rh;
      }
      x += cw;
    }
  }

  _addBlock(x: number, y: number, w: number, h: number, palette: number[][], chars: string, baseFontSize: number) {
    let bg = palette[this.p.floor(this.p.random(palette.length))];
    let fg = palette[this.p.floor(this.p.random(palette.length))];
    while (this._dist(bg, fg) < 100) fg = palette[this.p.floor(this.p.random(palette.length))];

    let fontSize = this.p.constrain(this.p.floor(this.p.random(baseFontSize - 3, baseFontSize + 3)), 6, 16);

    let roll = this.p.random();
    let mode = "normal";
    if (roll < 0.06) mode = "blank";
    else if (roll < 0.10) mode = "text";

    this.blocks.push({
      x, y, w, h, bg, fg,
      ch: chars[this.p.floor(this.p.random(chars.length))],
      fontSize, mode,
      phase: this.p.random(this.p.TWO_PI),
      cr: this.p.random(0.004, 0.016),
    });
  }

  _dist(a: number[], b: number[]) {
    return this.p.abs(a[0] - b[0]) + this.p.abs(a[1] - b[1]) + this.p.abs(a[2] - b[2]);
  }

  update() {
    this.t += 0.005;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.textFont("monospace");
    g.textStyle(this.p.BOLD as any);

    let allChars = this.chars;

    for (let b of this.blocks) {
      if (b.mode === "text") {
        this._drawText(g, b, allChars);
      } else if (b.mode === "blank") {
        g.noStroke();
        g.fill(b.bg[0], b.bg[1], b.bg[2]);
        g.rect(b.x, b.y, b.w, b.h);
      } else {
        g.noStroke();
        g.fill(b.bg[0], b.bg[1], b.bg[2]);
        g.rect(b.x, b.y, b.w, b.h);
        this._drawText(g, b, allChars);
      }
    }

    g.textStyle(this.p.NORMAL as any);
    return g;
  }

  _drawText(g: p5.Graphics, b: Block, allChars: string) {
    g.drawingContext.save();
    g.drawingContext.beginPath();
    g.drawingContext.rect(b.x, b.y, b.w, b.h);
    g.drawingContext.clip();

    g.fill(b.fg[0], b.fg[1], b.fg[2]);
    g.textSize(b.fontSize);
    g.textAlign(this.p.LEFT, this.p.TOP);

    let cw = b.fontSize * 0.62;
    let lh = b.fontSize * 1.12;
    let cols = this.p.ceil(b.w / cw) + 1;
    let rows = this.p.ceil(b.h / lh) + 1;

    let ci = allChars.indexOf(b.ch);
    if (ci < 0) ci = 0;
    let shift = this.p.floor(this.t / b.cr) % allChars.length;
    let cc = allChars[(ci + shift) % allChars.length];

    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) line += cc;
      g.text(line, b.x, b.y + r * lh);
    }

    g.drawingContext.restore();
  }
}

export default ColorGridLayer;
