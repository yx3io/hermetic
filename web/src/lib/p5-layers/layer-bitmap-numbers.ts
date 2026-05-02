// @ts-nocheck
import type p5 from "p5";

interface Glyph {
  bitmap: number[];
  x: number;
  y: number;
  scale: number;
  color: number[];
}

interface Cluster {
  text: string;
  x: number;
  y: number;
  scale: number;
}

class BitmapNumbersLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  glyphs: Glyph[];
  t: number;

  constructor(
    w: number,
    h: number,
    p: p5,
    clusters: Cluster[] = [
      { text: "50001", x: 0.05, y: 0.25, scale: 28 },
      { text: "j1", x: 0.25, y: 0.55, scale: 35 },
      { text: "0555", x: 0.15, y: 0.08, scale: 12 },
      { text: "888n8", x: 0.5, y: 0.03, scale: 10 },
      { text: "1j00", x: 0.03, y: 0.12, scale: 14 },
      { text: "5j55", x: 0.08, y: 0.18, scale: 14 },
      { text: "01", x: 0.02, y: 0.1, scale: 10 },
    ]
  ) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.glyphs = [];
    this.t = 0;
    this._clusters = clusters;
  }

  private _clusters: Cluster[];

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    const font = this._getFont();

    let clusters: Cluster[] = [...this._clusters];

    let vertNums = ["8", "0", "5", "3", "5", "8"];
    for (let i = 0; i < vertNums.length; i++) {
      clusters.push({
        text: vertNums[i],
        x: -0.02,
        y: 0.05 + i * 0.14,
        scale: 30,
      });
    }

    let extras: Cluster[] = [
      { text: "88", x: 0.7, y: 0.6, scale: 22 },
      { text: "007", x: 0.15, y: 0.75, scale: 20 },
      { text: "n", x: 0.3, y: 0.65, scale: 18 },
    ];
    clusters = clusters.concat(extras);

    for (let cl of clusters) {
      let xOff = 0;
      for (let i = 0; i < cl.text.length; i++) {
        let ch = cl.text[i];
        let glyph = font[ch];
        if (!glyph) { xOff += 4 * cl.scale; continue; }

        this.glyphs.push({
          bitmap: glyph,
          x: this.w * cl.x + xOff,
          y: this.h * cl.y,
          scale: cl.scale,
          color: this.p.random() > 0.7 ? [120, 255, 80] : [230, 230, 225],
        });
        xOff += 6 * cl.scale;
      }
    }
  }

  _getFont(): Record<string, number[]> {
    return {
      '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
      '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
      '2': [0x42, 0x61, 0x51, 0x49, 0x46],
      '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
      '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
      '5': [0x27, 0x45, 0x45, 0x45, 0x39],
      '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
      '7': [0x01, 0x71, 0x09, 0x05, 0x03],
      '8': [0x36, 0x49, 0x49, 0x49, 0x36],
      '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
      'j': [0x20, 0x40, 0x44, 0x3D, 0x00],
      'n': [0x7C, 0x08, 0x04, 0x04, 0x78],
      'm': [0x7C, 0x04, 0x18, 0x04, 0x78],
    };
  }

  update() {
    this.t += 0.003;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.noStroke();

    for (let gl of this.glyphs) {
      let c = gl.color;
      let flicker = this.p.sin(this.t * 2 + gl.x * 0.005) * 15;
      g.fill(c[0], c[1], c[2], 220 + flicker);

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

export default BitmapNumbersLayer;
