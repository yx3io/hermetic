// @ts-nocheck
import type p5 from "p5";

class DenseLinesLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  seed: number;
  t: number;

  constructor(w: number, h: number, p: p5) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.seed = 0;
    this.t = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);
    this.seed = this.p.random(10000);
  }

  update() {
    this.t += 0.001;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.strokeWeight(0.6);
    g.noFill();

    let lineSpacing = 1.8;
    let noiseScaleX = 0.004;
    let noiseScaleY = 0.008;
    let warpAmt = 60;

    let regionX = this.w * 0.35;
    let regionY = this.h * 0.15;

    for (let y = regionY; y < this.h; y += lineSpacing) {
      let ny = (y - regionY) / (this.h - regionY);
      let fadeIn = this.p.min(1, (y - regionY) / 80);
      let densityNoise = this.p.noise(this.seed + 100, y * 0.005);
      if (densityNoise < 0.2) continue;

      let a = 180 * fadeIn * densityNoise;
      g.stroke(220, 220, 215, a);

      g.beginShape();
      for (let x = regionX; x <= this.w; x += 2) {
        let n = this.p.noise(
          this.seed + x * noiseScaleX,
          y * noiseScaleY + this.t,
          ny * 0.5
        );
        let warp = (n - 0.5) * warpAmt * (1 + ny);
        g.vertex(x, y + warp);
      }
      g.endShape();
    }

    g.strokeWeight(0.5);
    let seed2 = this.seed + 5000;
    for (let y = 0; y < this.h * 0.5; y += 2.5) {
      let a = this.p.map(y, 0, this.h * 0.5, 60, 20);
      g.stroke(200, 200, 200, a);
      g.beginShape();
      for (let x = this.w * 0.5; x <= this.w; x += 3) {
        let n = this.p.noise(seed2 + x * 0.005, y * 0.01 + this.t);
        let diagOffset = (x - this.w * 0.5) * 0.3;
        let warp = (n - 0.5) * 40;
        g.vertex(x, y + diagOffset + warp);
      }
      g.endShape();
    }

    return g;
  }
}

export default DenseLinesLayer;
