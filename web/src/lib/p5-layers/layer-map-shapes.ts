// @ts-nocheck
import type p5 from "p5";

interface CharOverlayItem {
  x: number;
  y: number;
  char: string;
  alpha: number;
}

class MapShapesLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  seed: number;
  charOverlay: CharOverlayItem[];
  t: number;
  chars: string;

  constructor(w: number, h: number, p: p5, chars?: string) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.seed = 0;
    this.charOverlay = [];
    this.t = 0;
    this.chars = chars ?? "n8mM0nnm88nn8n";
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);
    this.seed = this.p.random(10000);

    for (let y = 0; y < this.h; y += 10) {
      for (let x = 0; x < this.w; x += 7) {
        this.charOverlay.push({
          x, y,
          char: this.chars[this.p.floor(this.p.random(this.chars.length))],
          alpha: this.p.random(30, 80)
        });
      }
    }
  }

  update() {
    this.t += 0.001;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.noStroke();

    let noiseScale = 0.003;

    for (let y = 0; y < this.h; y += 2) {
      for (let x = 0; x < this.w; x += 2) {
        let n = this.p.noise(this.seed + x * noiseScale, y * noiseScale * 1.2);
        let n2 = this.p.noise(this.seed + 500 + x * noiseScale * 0.8, y * noiseScale);

        if (n > 0.52 && n < 0.72) {
          let bright = this.p.map(n, 0.52, 0.72, 120, 240);
          g.fill(bright * 0.4, bright, bright * 0.3, 180);
          g.rect(x, y, 2, 2);
        }
        if (n2 > 0.55 && n2 < 0.75) {
          let grey = this.p.map(n2, 0.55, 0.75, 140, 200);
          g.fill(grey, grey, grey - 5, 150);
          g.rect(x, y, 2, 2);
        }
      }
    }

    g.textFont("monospace");
    g.textSize(8);
    g.textAlign(this.p.LEFT, this.p.TOP);
    for (let co of this.charOverlay) {
      let n = this.p.noise(this.seed + co.x * noiseScale, co.y * noiseScale * 1.2);
      let n2 = this.p.noise(this.seed + 500 + co.x * noiseScale * 0.8, co.y * noiseScale);

      if ((n > 0.52 && n < 0.72) || (n2 > 0.55 && n2 < 0.75)) {
        let isGreen = n > 0.52 && n < 0.72;
        if (isGreen) {
          g.fill(30, 80, 20, co.alpha);
        } else {
          g.fill(60, 60, 55, co.alpha);
        }
        g.text(co.char, co.x, co.y);
      }
    }

    g.fill(100, 100, 95, 100);
    g.textSize(6);
    for (let y = 0; y < this.h; y += 6) {
      for (let x = 0; x < this.w; x += 6) {
        let n = this.p.noise(this.seed + x * noiseScale, y * noiseScale * 1.2);
        let nRight = this.p.noise(this.seed + (x + 6) * noiseScale, y * noiseScale * 1.2);
        let nDown = this.p.noise(this.seed + x * noiseScale, (y + 6) * noiseScale * 1.2);

        let isIn = n > 0.52 && n < 0.72;
        let rightIn = nRight > 0.52 && nRight < 0.72;
        let downIn = nDown > 0.52 && nDown < 0.72;

        if (isIn !== rightIn || isIn !== downIn) {
          g.text("n", x, y);
        }
      }
    }

    return g;
  }
}

export default MapShapesLayer;
