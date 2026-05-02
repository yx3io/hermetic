// @ts-nocheck
import type p5 from "p5";

class GeoDataLayer {
  w: number;
  h: number;
  p: p5;
  buf: any;
  circuits: any[];
  waveforms: any[];
  hexClusters: any[];
  flowArrows: any[];
  dataLabels: any[];
  dotMatrix: any[];
  signalPaths: any[];
  t: number;

  constructor(w: number, h: number, p: p5) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.circuits = [];
    this.waveforms = [];
    this.hexClusters = [];
    this.flowArrows = [];
    this.dataLabels = [];
    this.dotMatrix = [];
    this.signalPaths = [];
    this.t = 0;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    for (let i = 0; i < 25; i++) {
      let path = [];
      let x = this.p.random(this.w);
      let y = this.p.random(this.h);
      let segments = this.p.floor(this.p.random(4, 12));
      path.push({ x, y });
      for (let s = 0; s < segments; s++) {
        let horizontal = s % 2 === 0;
        if (horizontal) {
          x += this.p.random(-200, 200);
        } else {
          y += this.p.random(-150, 150);
        }
        x = this.p.constrain(x, 5, this.w - 5);
        y = this.p.constrain(y, 5, this.h - 5);
        path.push({ x, y });
      }
      this.circuits.push({
        path,
        color: this.p.random() > 0.6 ? [50, 50, 220] : [80, 80, 180],
        alpha: this.p.random(40, 120),
        weight: this.p.random(0.5, 1.5),
        hasNode: this.p.random() > 0.3
      });
    }

    let wavePositions = [
      [0.05, 0.1], [0.4, 0.08], [0.7, 0.15],
      [0.1, 0.4], [0.55, 0.5], [0.8, 0.45],
      [0.2, 0.7], [0.5, 0.75], [0.85, 0.8],
      [0.15, 0.92], [0.6, 0.9]
    ];
    for (let wp of wavePositions) {
      let waveW = this.p.random(80, 200);
      let freq = this.p.random(0.02, 0.08);
      let amp = this.p.random(8, 25);
      let seed = this.p.random(10000);
      this.waveforms.push({
        x: this.w * wp[0],
        y: this.h * wp[1],
        width: waveW,
        freq, amp, seed,
        type: this.p.random() > 0.5 ? "sine" : "noise"
      });
    }

    for (let i = 0; i < 8; i++) {
      let cx = this.p.random(this.w * 0.1, this.w * 0.9);
      let cy = this.p.random(this.h * 0.1, this.h * 0.9);
      let cells = [];
      let hexR = this.p.random(6, 12);
      let rings = this.p.floor(this.p.random(1, 3));
      cells.push({ x: 0, y: 0, val: this.p.random() });
      for (let ring = 1; ring <= rings; ring++) {
        for (let a = 0; a < 6; a++) {
          let angle = a * this.p.PI / 3;
          cells.push({
            x: this.p.cos(angle) * hexR * 1.8 * ring,
            y: this.p.sin(angle) * hexR * 1.8 * ring,
            val: this.p.random()
          });
        }
      }
      this.hexClusters.push({ cx, cy, cells, hexR });
    }

    for (let i = 0; i < 18; i++) {
      this.flowArrows.push({
        x: this.p.random(this.w),
        y: this.p.random(this.h),
        angle: this.p.random(this.p.TWO_PI),
        len: this.p.random(20, 60),
        speed: this.p.random(0.005, 0.02)
      });
    }

    let readouts = [
      "SIG: 0.847", "FREQ: 2.4GHz", "LAT: -12.04", "BW: 128Mb/s",
      "PING: 23ms", "TX/RX: 1.2/0.8", "SNR: 34dB", "LOSS: 0.02%",
      "PORT: 8080", "PKT: 1048576", "TTL: 64", "MTU: 1500",
      "DNS: OK", "ROUTE: 14", "HOP: 7/12", "JITTER: 3ms",
      "ERR: 0x00", "CRC: PASS", "SYNC: LOCKED", "BAND: C"
    ];
    for (let i = 0; i < readouts.length; i++) {
      this.dataLabels.push({
        text: readouts[i],
        x: (i % 5) / 5 * this.w + this.p.random(10, this.w * 0.12),
        y: this.p.floor(i / 5) / 4 * this.h + this.p.random(10, this.h * 0.12)
      });
    }

    for (let i = 0; i < 5; i++) {
      let rx = this.p.random(this.w * 0.05, this.w * 0.8);
      let ry = this.p.random(this.h * 0.05, this.h * 0.8);
      let cols = this.p.floor(this.p.random(10, 25));
      let rows = this.p.floor(this.p.random(5, 12));
      let dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (this.p.random() < 0.4) {
            dots.push({ c, r, bright: this.p.random(0.3, 1) });
          }
        }
      }
      this.dotMatrix.push({ x: rx, y: ry, cols, rows, dots, spacing: this.p.random(4, 7) });
    }

    for (let i = 0; i < 12; i++) {
      let x1 = this.p.random(this.w);
      let y1 = this.p.random(this.h);
      let x2 = x1 + this.p.random(-300, 300);
      let y2 = y1 + this.p.random(-200, 200);
      this.signalPaths.push({
        x1, y1, x2, y2,
        cx1: x1 + this.p.random(-100, 100),
        cy1: y1 + this.p.random(-100, 100),
        cx2: x2 + this.p.random(-100, 100),
        cy2: y2 + this.p.random(-100, 100),
        pulseSpeed: this.p.random(0.01, 0.04)
      });
    }
  }

  update() {
    this.t += 0.01;
  }

  render() {
    let g = this.buf;
    g.clear();

    g.noFill();
    for (let circ of this.circuits) {
      g.stroke(circ.color[0], circ.color[1], circ.color[2], circ.alpha);
      g.strokeWeight(circ.weight);
      g.beginShape();
      for (let p of circ.path) {
        g.vertex(p.x, p.y);
      }
      g.endShape();

      if (circ.hasNode) {
        let last = circ.path[circ.path.length - 1];
        g.fill(circ.color[0], circ.color[1], circ.color[2], circ.alpha + 40);
        g.noStroke();
        g.ellipse(last.x, last.y, 4, 4);
        g.noFill();
      }
    }

    for (let sp of this.signalPaths) {
      g.noFill();
      g.stroke(50, 50, 220, 40);
      g.strokeWeight(0.6);
      g.bezier(sp.x1, sp.y1, sp.cx1, sp.cy1, sp.cx2, sp.cy2, sp.x2, sp.y2);

      let t = (this.p.sin(this.t * sp.pulseSpeed * 100) + 1) / 2;
      let px = this.p.bezierPoint(sp.x1, sp.cx1, sp.cx2, sp.x2, t);
      let py = this.p.bezierPoint(sp.y1, sp.cy1, sp.cy2, sp.y2, t);
      g.fill(80, 80, 255, 150);
      g.noStroke();
      g.ellipse(px, py, 4, 4);
    }
    g.noFill();

    g.noFill();
    g.strokeWeight(0.8);
    for (let wf of this.waveforms) {
      g.stroke(50, 50, 220, 90);
      g.beginShape();
      for (let x = 0; x < wf.width; x += 2) {
        let val;
        if (wf.type === "sine") {
          val = this.p.sin((x + this.t * 50) * wf.freq) * wf.amp;
        } else {
          val = (this.p.noise(wf.seed + x * 0.03 + this.t) - 0.5) * wf.amp * 2;
        }
        g.vertex(wf.x + x, wf.y + val);
      }
      g.endShape();
      g.stroke(50, 50, 220, 25);
      g.line(wf.x, wf.y, wf.x + wf.width, wf.y);
    }

    for (let hc of this.hexClusters) {
      for (let cell of hc.cells) {
        let bright = cell.val * 150 + 30;
        g.stroke(40, 40, bright + 80, 80);
        g.strokeWeight(0.6);
        g.noFill();
        this._drawHex(g, hc.cx + cell.x, hc.cy + cell.y, hc.hexR);
        if (cell.val > 0.6) {
          g.fill(40, 40, bright + 80, 50);
          g.noStroke();
          this._drawHex(g, hc.cx + cell.x, hc.cy + cell.y, hc.hexR * 0.6);
        }
      }
    }

    g.strokeWeight(0.8);
    for (let fa of this.flowArrows) {
      let a = fa.angle + this.p.sin(this.t * fa.speed * 100) * 0.3;
      let ex = fa.x + this.p.cos(a) * fa.len;
      let ey = fa.y + this.p.sin(a) * fa.len;
      g.stroke(60, 60, 200, 60);
      g.line(fa.x, fa.y, ex, ey);
      let headLen = 6;
      g.line(ex, ey, ex - this.p.cos(a - 0.4) * headLen, ey - this.p.sin(a - 0.4) * headLen);
      g.line(ex, ey, ex - this.p.cos(a + 0.4) * headLen, ey - this.p.sin(a + 0.4) * headLen);
    }

    g.textFont("monospace");
    g.textSize(8);
    g.textAlign(this.p.LEFT);
    g.noStroke();
    g.fill(50, 50, 220, 120);
    for (let dl of this.dataLabels) {
      g.text(dl.text, dl.x, dl.y);
    }

    g.noStroke();
    for (let dm of this.dotMatrix) {
      for (let dot of dm.dots) {
        let b = dot.bright * 180;
        g.fill(30, 30, b + 60, b);
        g.rect(dm.x + dot.c * dm.spacing, dm.y + dot.r * dm.spacing,
          dm.spacing - 1, dm.spacing - 1);
      }
    }

    return g;
  }

  _drawHex(g: any, cx: number, cy: number, r: number) {
    g.beginShape();
    for (let i = 0; i < 6; i++) {
      let angle = i * this.p.PI / 3 - this.p.PI / 6;
      g.vertex(cx + this.p.cos(angle) * r, cy + this.p.sin(angle) * r);
    }
    g.endShape(this.p.CLOSE);
  }
}

export default GeoDataLayer;
