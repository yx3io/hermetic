// @ts-nocheck
import type p5 from "p5";

// Trial 3 — Pixel + Swiss + Bitmap Numbers hybrid
// Big bold typography, character blocks, large and small bitmap numbers

class Trial3Layer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  bigTexts: any[];
  smallTexts: any[];
  charBlocks: any[];
  bitmapGlyphs: any[];
  brackets: any[];
  lines: any[];
  t: number;
  labelTexts: string[];

  constructor(w: number, h: number, p: p5, labelTexts?: string[]) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.bigTexts = [];
    this.smallTexts = [];
    this.charBlocks = [];
    this.bitmapGlyphs = [];
    this.brackets = [];
    this.lines = [];
    this.t = 0;
    this.labelTexts = labelTexts ?? [
      "[Content type]", "[Actions]", "[Filter]", "[Render]",
      "[State]", "[Input]", "[Cache]", "[Node]",
      "{Output}", "{Stream}", "{Layout}", "{Config}",
      "(Graph)", "(Edge)", "(Init)", "(Update)"
    ];
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let font = this._getFont();

    // Big bold typographic words — swiss style but huge
    let bigWords = [
      { text: "WITHIN CELLS", x: 0.02, y: 0.18, size: 55, color: [230, 230, 225] },
      { text: "INTERLINKED", x: 0.05, y: 0.28, size: 50, color: [220, 220, 215] },
      { text: "SYSTEM", x: 0.4, y: 0.55, size: 70, color: [50, 50, 220] },
      { text: "NET.ART", x: 0.1, y: 0.72, size: 65, color: [180, 180, 175] },
      { text: "REAL", x: 0.55, y: 0.08, size: 80, color: [100, 240, 80] },
      { text: "DATA", x: 0.6, y: 0.82, size: 60, color: [50, 50, 220] },
    ];
    for (let bw of bigWords) {
      this.bigTexts.push({
        text: bw.text,
        x: this.w * bw.x,
        y: this.h * bw.y,
        size: bw.size,
        color: bw.color,
        bold: true
      });
    }

    // Medium swiss-style labels with brackets
    let labels = this.labelTexts;
    for (let i = 0; i < labels.length; i++) {
      this.smallTexts.push({
        text: labels[i],
        x: this.p.random(this.w * 0.05, this.w * 0.9),
        y: this.p.random(this.h * 0.05, this.h * 0.9),
        size: this.p.random(11, 22),
        color: this.p.random() > 0.6 ? [50, 50, 220] : [180, 180, 175]
      });
    }

    // Pixel character blocks — like pixel mosaic but fewer, bolder
    let chars = "CP68+(<)XMWN";
    let palettes = [
      [[50, 50, 220], [230, 230, 225]],
      [[240, 80, 130], [255, 255, 255]],
      [[255, 200, 0], [0, 0, 0]],
      [[100, 240, 80], [0, 0, 0]],
    ];
    for (let i = 0; i < 20; i++) {
      let pal = palettes[this.p.floor(this.p.random(palettes.length))];
      this.charBlocks.push({
        x: this.p.random(this.w),
        y: this.p.random(this.h),
        char: chars[this.p.floor(this.p.random(chars.length))],
        size: this.p.random(25, 80),
        bgColor: pal[0],
        fgColor: pal[1],
        hasBg: this.p.random() > 0.3,
        alpha: this.p.random(120, 220)
      });
    }

    // Large bitmap numbers — scattered across canvas
    let bigNums = [
      { ch: "5", x: 0.02, y: 0.4, scale: 22 },
      { ch: "0", x: 0.8, y: 0.2, scale: 18 },
      { ch: "8", x: 0.35, y: 0.6, scale: 25 },
      { ch: "1", x: 0.7, y: 0.45, scale: 20 },
      { ch: "3", x: 0.15, y: 0.85, scale: 16 },
    ];
    for (let bn of bigNums) {
      let glyph = font[bn.ch];
      if (glyph) {
        this.bitmapGlyphs.push({
          bitmap: glyph,
          x: this.w * bn.x,
          y: this.h * bn.y,
          scale: bn.scale,
          color: this.p.random() > 0.5 ? [220, 220, 215] : [100, 240, 80]
        });
      }
    }

    // Small bitmap numbers — many scattered
    for (let i = 0; i < 30; i++) {
      let ch = String(this.p.floor(this.p.random(10)));
      let glyph = font[ch];
      if (glyph) {
        this.bitmapGlyphs.push({
          bitmap: glyph,
          x: this.p.random(this.w),
          y: this.p.random(this.h),
          scale: this.p.random(4, 10),
          color: this.p.random() > 0.7 ? [100, 240, 80] : [180, 180, 175]
        });
      }
    }

    // Connecting lines — swiss style
    for (let i = 0; i < 12; i++) {
      this.lines.push({
        x1: this.p.random(this.w), y1: this.p.random(this.h),
        x2: this.p.random(this.w), y2: this.p.random(this.h),
        weight: this.p.random(0.3, 1.5),
        color: [120, 120, 120],
        alpha: this.p.random(40, 100)
      });
    }

    // Brackets and decorations
    for (let i = 0; i < 8; i++) {
      this.brackets.push({
        x: this.p.random(this.w * 0.05, this.w * 0.9),
        y: this.p.random(this.h * 0.05, this.h * 0.9),
        type: this.p.random(["{", "}", "[", "]", "(", ")", "<", ">"]),
        size: this.p.random(30, 80),
        color: [50, 50, 220],
        alpha: this.p.random(60, 140)
      });
    }
  }

  _getFont(): Record<string, number[]> {
    return {
      '0': [0x3E,0x51,0x49,0x45,0x3E],
      '1': [0x00,0x42,0x7F,0x40,0x00],
      '2': [0x42,0x61,0x51,0x49,0x46],
      '3': [0x21,0x41,0x45,0x4B,0x31],
      '4': [0x18,0x14,0x12,0x7F,0x10],
      '5': [0x27,0x45,0x45,0x45,0x39],
      '6': [0x3C,0x4A,0x49,0x49,0x30],
      '7': [0x01,0x71,0x09,0x05,0x03],
      '8': [0x36,0x49,0x49,0x49,0x36],
      '9': [0x06,0x49,0x49,0x29,0x1E],
    };
  }

  update() {
    this.t += 0.004;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.textFont("monospace");

    // Connecting lines
    for (let ln of this.lines) {
      g.stroke(ln.color[0], ln.color[1], ln.color[2], ln.alpha);
      g.strokeWeight(ln.weight);
      g.line(ln.x1, ln.y1, ln.x2, ln.y2);
    }
    g.noStroke();

    // Character blocks with backgrounds
    for (let cb of this.charBlocks) {
      if (cb.hasBg) {
        g.fill(cb.bgColor[0], cb.bgColor[1], cb.bgColor[2], cb.alpha * 0.5);
        g.rect(cb.x - 4, cb.y - cb.size * 0.7, cb.size * 0.8, cb.size);
      }
      g.fill(cb.fgColor[0], cb.fgColor[1], cb.fgColor[2], cb.alpha);
      g.textSize(cb.size);
      g.textAlign(this.p.CENTER, this.p.CENTER);
      g.text(cb.char, cb.x, cb.y);
    }

    // Big bold text
    for (let bt of this.bigTexts) {
      let c = bt.color;
      let flicker = this.p.sin(this.t * 2 + bt.x * 0.005) * 10;
      g.fill(c[0], c[1], c[2], 200 + flicker);
      g.textSize(bt.size);
      g.textAlign(this.p.LEFT, this.p.TOP);
      g.textStyle(this.p.BOLD);
      g.text(bt.text, bt.x, bt.y);
    }
    g.textStyle(this.p.NORMAL);

    // Small labels
    for (let st of this.smallTexts) {
      g.fill(st.color[0], st.color[1], st.color[2], 170);
      g.textSize(st.size);
      g.textAlign(this.p.LEFT, this.p.TOP);
      g.text(st.text, st.x, st.y);
    }

    // Brackets
    for (let br of this.brackets) {
      g.fill(br.color[0], br.color[1], br.color[2], br.alpha);
      g.textSize(br.size);
      g.textAlign(this.p.CENTER, this.p.CENTER);
      g.text(br.type, br.x, br.y);
    }

    // Bitmap numbers
    g.noStroke();
    for (let gl of this.bitmapGlyphs) {
      let c = gl.color;
      g.fill(c[0], c[1], c[2], 200);
      for (let col = 0; col < 5; col++) {
        let colData = gl.bitmap[col];
        for (let row = 0; row < 7; row++) {
          if ((colData >> row) & 1) {
            g.rect(
              gl.x + col * gl.scale,
              gl.y + row * gl.scale,
              gl.scale - 1,
              gl.scale - 1
            );
          }
        }
      }
    }

    return g;
  }
}

export default Trial3Layer;
