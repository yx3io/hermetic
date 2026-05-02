// @ts-nocheck
import type p5 from "p5";

class PixelMosaicLayer {
  w: number;
  h: number;
  p: p5;
  buf: any;
  regions: any[];
  charGrid: any[];
  bitmapWord: any;
  t: number;

  constructor(w: number, h: number, p: p5) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.regions = [];
    this.charGrid = [];
    this.bitmapWord = [];
    this.t = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let palettes = [
      [[50, 50, 220], [0, 0, 0], [230, 230, 225]],
      [[240, 80, 130], [0, 0, 0], [255, 255, 255]],
      [[255, 200, 0], [0, 0, 0], [180, 180, 175]]
    ];
    let pal = this.p.random(palettes);

    let chars = "CP68+(<)";
    let cellSize = 10;

    for (let i = 0; i < 4; i++) {
      let rx = this.p.random(0, this.w * 0.8);
      let ry = this.p.random(0, this.h * 0.8);
      let rw = this.p.floor(this.p.random(8, 25));
      let rh = this.p.floor(this.p.random(6, 18));
      let regionChars = [];

      for (let row = 0; row < rh; row++) {
        let line = "";
        for (let col = 0; col < rw; col++) {
          line += chars[this.p.floor(this.p.random(chars.length))];
        }
        regionChars.push(line);
      }

      this.regions.push({
        x: rx, y: ry,
        chars: regionChars,
        cellSize: cellSize,
        color: pal[this.p.floor(this.p.random(pal.length))],
        alpha: this.p.random(80, 200)
      });
    }

    for (let i = 0; i < 12; i++) {
      this.charGrid.push({
        x: this.p.random(this.w),
        y: this.p.random(this.h),
        char: chars[this.p.floor(this.p.random(chars.length))],
        size: this.p.random(20, 60),
        bgColor: pal[this.p.floor(this.p.random(pal.length))],
        fgColor: pal[(this.p.floor(this.p.random(pal.length)) + 1) % pal.length],
        hasBg: this.p.random() > 0.4
      });
    }

    let word = "REAL";
    let pixelMap = this._generateBitmapWord(word);
    this.bitmapWord = {
      pixels: pixelMap,
      x: this.p.random(this.w * 0.1, this.w * 0.3),
      y: this.p.random(this.h * 0.3, this.h * 0.5),
      scale: this.p.random(5, 9),
      color: pal[0]
    };
  }

  _generateBitmapWord(word: string) {
    let font5x7: Record<string, number[]> = {
      'R': [0x7C, 0x12, 0x12, 0x12, 0x6C],
      'E': [0x7E, 0x4A, 0x4A, 0x4A, 0x42],
      'A': [0x7C, 0x12, 0x12, 0x12, 0x7C],
      'L': [0x7E, 0x40, 0x40, 0x40, 0x40],
    };
    let pixels = [];
    let charW = 6;
    for (let ci = 0; ci < word.length; ci++) {
      let ch = word[ci];
      let glyph = font5x7[ch] || [0, 0, 0, 0, 0];
      for (let col = 0; col < 5; col++) {
        let colData = glyph[col];
        for (let row = 0; row < 7; row++) {
          if ((colData >> row) & 1) {
            pixels.push({ x: ci * charW + col, y: row });
          }
        }
      }
    }
    return pixels;
  }

  update() {
    this.t += 0.008;
  }

  render() {
    let g = this.buf;
    g.clear();
    g.textFont("monospace");

    for (let reg of this.regions) {
      g.fill(reg.color[0], reg.color[1], reg.color[2], reg.alpha);
      g.noStroke();
      g.textSize(reg.cellSize);
      g.textAlign(this.p.LEFT, this.p.TOP);
      for (let r = 0; r < reg.chars.length; r++) {
        g.text(reg.chars[r], reg.x, reg.y + r * (reg.cellSize + 2));
      }
    }

    for (let cb of this.charGrid) {
      if (cb.hasBg) {
        g.noStroke();
        g.fill(cb.bgColor[0], cb.bgColor[1], cb.bgColor[2], 120);
        g.rect(cb.x - 4, cb.y - cb.size * 0.7, cb.size * 0.8, cb.size);
      }
      g.fill(cb.fgColor[0], cb.fgColor[1], cb.fgColor[2], 180);
      g.noStroke();
      g.textSize(cb.size);
      g.textAlign(this.p.CENTER, this.p.CENTER);
      g.text(cb.char, cb.x, cb.y);
    }

    let bw = this.bitmapWord;
    g.noStroke();
    let flicker = this.p.sin(this.t * 3) > -0.9;
    if (flicker && bw.pixels) {
      g.fill(bw.color[0], bw.color[1], bw.color[2], 140);
      for (let p of bw.pixels) {
        g.rect(bw.x + p.x * bw.scale, bw.y + p.y * bw.scale, bw.scale - 1, bw.scale - 1);
      }
    }

    let stripY = this.p.random(this.h * 0.7, this.h * 0.85);
    let stripX = this.p.random(this.w * 0.2, this.w * 0.4);
    g.noStroke();
    for (let r = 0; r < 30; r++) {
      for (let c = 0; c < 4; c++) {
        if ((r + c) % 2 === 0) {
          g.fill(100, 240, 80, 60);
        } else {
          g.fill(40, 40, 40, 60);
        }
        g.rect(stripX + c * 6, stripY + r * 6, 6, 6);
      }
    }

    return g;
  }
}

export default PixelMosaicLayer;
