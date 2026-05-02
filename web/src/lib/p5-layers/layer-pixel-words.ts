// @ts-nocheck
import type p5 from "p5";

interface WordDef {
  text: string;
  x: number;
  y: number;
  scale: number;
  color: number[];
}

interface WordBlock {
  bitmap: number[];
  x: number;
  y: number;
  scale: number;
  color: number[];
}

class PixelWordsLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  wordBlocks: WordBlock[];
  t: number;
  words: WordDef[];

  constructor(w: number, h: number, p: p5, words?: WordDef[]) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.wordBlocks = [];
    this.t = 0;
    this.words = words ?? [
      { text: "WHAT", x: 0.0, y: 0.1, scale: 16, color: [60, 60, 230] },
      { text: "MAKES", x: 0.05, y: 0.3, scale: 14, color: [60, 60, 230] },
      { text: "REAL", x: 0.1, y: 0.5, scale: 18, color: [60, 60, 230] },
      { text: "DATA", x: 0.6, y: 0.15, scale: 10, color: [200, 200, 200] },
      { text: "CODE", x: 0.7, y: 0.7, scale: 12, color: [200, 200, 200] },
      { text: "NET", x: 0.5, y: 0.85, scale: 14, color: [100, 240, 80] },
    ];
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    const font = this._getFont();

    for (let word of this.words) {
      let xOff = 0;
      for (let i = 0; i < word.text.length; i++) {
        let ch = word.text[i];
        let glyph = font[ch];
        if (!glyph) { xOff += 4 * word.scale; continue; }
        this.wordBlocks.push({
          bitmap: glyph,
          x: this.w * word.x + xOff,
          y: this.h * word.y + i * word.scale * 1.5,
          scale: word.scale,
          color: word.color
        });
        xOff += 6 * word.scale;
      }
    }
  }

  _getFont(): Record<string, number[]> {
    return {
      'A': [0x7C,0x12,0x11,0x12,0x7C],
      'C': [0x3E,0x41,0x41,0x41,0x22],
      'D': [0x7F,0x41,0x41,0x22,0x1C],
      'E': [0x7F,0x49,0x49,0x49,0x41],
      'H': [0x7F,0x08,0x08,0x08,0x7F],
      'K': [0x7F,0x08,0x14,0x22,0x41],
      'L': [0x7F,0x40,0x40,0x40,0x40],
      'M': [0x7F,0x02,0x0C,0x02,0x7F],
      'N': [0x7F,0x04,0x08,0x10,0x7F],
      'O': [0x3E,0x41,0x41,0x41,0x3E],
      'R': [0x7F,0x09,0x19,0x29,0x46],
      'S': [0x46,0x49,0x49,0x49,0x31],
      'T': [0x01,0x01,0x7F,0x01,0x01],
      'W': [0x3F,0x40,0x30,0x40,0x3F],
      'X': [0x63,0x14,0x08,0x14,0x63],
    };
  }

  update() {
    this.t += 0.004;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.noStroke();

    for (let wb of this.wordBlocks) {
      let c = wb.color;
      g.fill(c[0], c[1], c[2], 200);
      for (let col = 0; col < 5; col++) {
        let colData = wb.bitmap[col];
        for (let row = 0; row < 7; row++) {
          if ((colData >> row) & 1) {
            g.rect(
              wb.x + col * wb.scale,
              wb.y + row * wb.scale,
              wb.scale - 1,
              wb.scale - 1
            );
          }
        }
      }
    }

    return g;
  }
}

export default PixelWordsLayer;
