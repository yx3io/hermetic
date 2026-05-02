// @ts-nocheck
import type p5 from "p5";

class GlitchTypoLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  noiseSeedVal: number;
  blocks: any[];
  asciiGrids: any[];
  t: number;

  constructor(w: number, h: number, p: p5) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.noiseSeedVal = 0;
    this.blocks = [];
    this.asciiGrids = [];
    this.t = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);
    this.noiseSeedVal = this.p.random(10000);

    let positions = [
      [0.1, 0.08], [0.4, 0.1], [0.75, 0.06], [0.9, 0.3],
      [0.15, 0.5], [0.5, 0.45], [0.85, 0.55],
      [0.3, 0.8], [0.65, 0.75], [0.1, 0.9]
    ];
    for (let pos of positions) {
      this.blocks.push({
        x: this.w * pos[0], y: this.h * pos[1],
        char: String(this.p.floor(this.p.random(10))),
        size: this.p.random(50, 130),
        alpha: this.p.random(40, 100)
      });
    }

    let chars = "0123456789*+-/()";
    let gridPos = [[0.02, 0.7], [0.4, 0.85], [0.72, 0.9]];
    for (let gp of gridPos) {
      let gridW = this.p.floor(this.p.random(30, 50));
      let gridH = this.p.floor(this.p.random(6, 10));
      let lines: string[] = [];
      for (let r = 0; r < gridH; r++) {
        let row = "";
        for (let c = 0; c < gridW; c++) {
          let mirror = c < gridW / 2 ? c : gridW - 1 - c;
          row += chars[(mirror + r * 3) % chars.length];
        }
        lines.push(row);
      }
      this.asciiGrids.push({ x: this.w * gp[0], y: this.h * gp[1], lines });
    }
  }

  update() {
    this.t += 0.002;
  }

  render() {
    let g = this.buf!;
    g.clear();

    let lineSpacing = 2;
    let noiseScale = 0.006;
    let warpAmt = 80;

    g.strokeWeight(0.7);
    for (let y = 0; y < this.h; y += lineSpacing) {
      let ny = y / this.h;
      let density = this.p.sin(ny * this.p.PI) * 0.8 + 0.2;
      if (this.p.random() > density) continue;

      g.noFill();
      let a = 80 + this.p.sin(ny * this.p.PI * 2) * 40;
      g.stroke(200, 195, 190, a);
      g.beginShape();
      for (let x = 0; x <= this.w; x += 3) {
        let n = this.p.noise(
          this.noiseSeedVal + x * noiseScale,
          y * noiseScale * 1.5 + this.t
        );
        let warp = (n - 0.5) * warpAmt;
        let yy = y + warp;
        g.vertex(x, yy);
      }
      g.endShape();
    }

    g.textFont("monospace");
    g.noStroke();
    for (let b of this.blocks) {
      g.fill(220, 215, 210, b.alpha);
      g.textSize(b.size);
      g.textStyle(this.p.BOLD);
      g.textAlign(this.p.CENTER, this.p.CENTER);
      g.text(b.char, b.x, b.y);
    }
    g.textStyle(this.p.NORMAL);

    g.fill(170, 170, 175, 120);
    g.textAlign(this.p.LEFT, this.p.TOP);
    g.textSize(10);
    for (let ag of this.asciiGrids) {
      for (let i = 0; i < ag.lines.length; i++) {
        g.text(ag.lines[i], ag.x, ag.y + i * 13);
      }
    }

    return g;
  }
}

export default GlitchTypoLayer;
