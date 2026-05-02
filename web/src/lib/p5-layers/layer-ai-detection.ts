// @ts-nocheck
import type p5 from "p5";

export default class AIDetectionLayer {
  w: number;
  h: number;
  p: p5;
  buf: any;
  t: number;
  boxes: any[];
  scanY: number;
  metadata: any[];
  trackLines: any[];
  gridCells: any[];
  cornerMarks: any[];
  dataLabels: any[];
  labels: string[];
  dataTexts: string[];

  constructor(w: number, h: number, p: p5, labels?: string[], dataTexts?: string[]) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.t = 0;
    this.boxes = [];
    this.scanY = 0;
    this.metadata = [];
    this.trackLines = [];
    this.gridCells = [];
    this.cornerMarks = [];
    this.dataLabels = [];
    this.labels = labels || [
      "Person", "Person", "Person", "Person", "Person",
      "Face", "Hand", "Object", "Vehicle", "Animal",
      "Unknown", "Entity", "Subject", "Target", "Figure"
    ];
    this.dataTexts = dataTexts || [
      "FPS: 30.0", "MODEL: YOLOv8-xl", "CONF_THRESH: 0.25",
      "NMS: 0.45", "INPUT: 640×640", "BACKEND: CUDA",
      "LATENCY: 12ms", "DEVICE: GPU:0", "BATCH: 1", "CLASSES: 80",
      "ANCHOR: AUTO", "STRIDE: [8,16,32]", "MEMORY: 4.2GB",
      "WARMUP: OK", "TRACK_ID: BOTSORT", "REID: ON",
      "FRAME: ####", "RESOLUTION: 1920×1080", "CODEC: H.264",
      "BITRATE: 8Mbps", "SOURCE: CAM_01", "STATUS: ACTIVE",
      "INFERENCE: TensorRT", "PRECISION: FP16", "AUGMENT: OFF"
    ];
  }

  init() {
    const p = this.p;
    this.buf = p.createGraphics(this.w, this.h);
    (this.buf as any).pixelDensity(1);

    this.boxes = [];
    for (let i = 0; i < 35; i++) {
      let bw = p.random(40, 180);
      let bh = p.random(50, 220);
      let conf = p.floor(p.random(8, 99));
      let label = this.labels[p.floor(p.random(this.labels.length))];
      let style = p.random() < 0.6 ? "full" : "corners";
      this.boxes.push({
        x: p.random(10, this.w - bw - 10),
        y: p.random(40, this.h - bh - 10),
        w: bw, h: bh,
        label: label,
        conf: conf,
        id: p.floor(p.random(1000, 9999)),
        style: style,
        color: conf > 70 ? [100, 240, 80] : (conf > 40 ? [255, 200, 0] : [240, 80, 130]),
        strokeW: p.random() < 0.3 ? 2.5 : 1.5,
        phase: p.random(p.TWO_PI),
        drift: p.random(0.3, 1.2),
        pulse: p.random(0.5, 2),
        active: p.random() < 0.8,
        confBar: conf > 0,
      });
    }

    for (let i = 0; i < 20; i++) {
      let cw = p.random(20, 60);
      let ch = p.random(20, 60);
      this.cornerMarks.push({
        x: p.random(5, this.w - cw),
        y: p.random(5, this.h - ch),
        w: cw, h: ch,
        len: p.random(5, 15),
        alpha: p.random(30, 80),
        phase: p.random(p.TWO_PI),
      });
    }

    this.trackLines = [];
    for (let i = 0; i < this.boxes.length; i++) {
      for (let j = i + 1; j < this.boxes.length; j++) {
        let a = this.boxes[i], b = this.boxes[j];
        let cx1 = a.x + a.w / 2, cy1 = a.y + a.h / 2;
        let cx2 = b.x + b.w / 2, cy2 = b.y + b.h / 2;
        let d = p.dist(cx1, cy1, cx2, cy2);
        if (d < 200 && p.random() < 0.3) {
          this.trackLines.push({
            x1: cx1, y1: cy1, x2: cx2, y2: cy2,
            alpha: p.random(15, 40),
            phase: p.random(p.TWO_PI),
          });
        }
      }
    }

    const dTexts = [...this.dataTexts];
    dTexts.push("DETECTIONS: " + this.boxes.length);
    this.dataLabels = [];
    for (let i = 0; i < 40; i++) {
      this.dataLabels.push({
        text: dTexts[p.floor(p.random(dTexts.length))],
        x: p.random(5, this.w - 100),
        y: p.random(30, this.h - 10),
        size: p.random(7, 11),
        alpha: p.random(20, 55),
        phase: p.random(p.TWO_PI),
        vertical: p.random() < 0.1,
      });
    }

    let gridSize = 40;
    this.gridCells = [];
    for (let gx = 0; gx < this.w; gx += gridSize) {
      for (let gy = 0; gy < this.h; gy += gridSize) {
        if (p.random() < 0.08) {
          this.gridCells.push({
            x: gx, y: gy, s: gridSize,
            alpha: p.random(5, 20),
            phase: p.random(p.TWO_PI),
          });
        }
      }
    }
  }

  update() {
    this.t += 0.015;
    this.scanY = (this.scanY + 1.5) % this.h;
  }

  render() {
    const p = this.p;
    let g = this.buf;
    g.background(0);

    g.stroke(30, 30, 35, 25);
    g.strokeWeight(0.5);
    for (let x = 0; x < this.w; x += 40) g.line(x, 0, x, this.h);
    for (let y = 0; y < this.h; y += 40) g.line(0, y, this.w, y);

    for (let cell of this.gridCells) {
      let a = cell.alpha * (0.5 + 0.5 * p.sin(this.t * 1.5 + cell.phase));
      g.noStroke();
      g.fill(100, 240, 80, a);
      g.rect(cell.x, cell.y, cell.s, cell.s);
    }

    for (let tl of this.trackLines) {
      let a = tl.alpha + 10 * p.sin(this.t * 2 + tl.phase);
      g.stroke(255, 200, 0, a);
      g.strokeWeight(0.5);
      this._dashedLine(g, tl.x1, tl.y1, tl.x2, tl.y2, 5, 4);
    }

    for (let cm of this.cornerMarks) {
      let a = cm.alpha + 15 * p.sin(this.t * 1.5 + cm.phase);
      g.stroke(255, 200, 0, a);
      g.strokeWeight(1);
      g.noFill();
      let l = cm.len;
      g.line(cm.x, cm.y, cm.x + l, cm.y);
      g.line(cm.x, cm.y, cm.x, cm.y + l);
      g.line(cm.x + cm.w, cm.y, cm.x + cm.w - l, cm.y);
      g.line(cm.x + cm.w, cm.y, cm.x + cm.w, cm.y + l);
      g.line(cm.x, cm.y + cm.h, cm.x + l, cm.y + cm.h);
      g.line(cm.x, cm.y + cm.h, cm.x, cm.y + cm.h - l);
      g.line(cm.x + cm.w, cm.y + cm.h, cm.x + cm.w - l, cm.y + cm.h);
      g.line(cm.x + cm.w, cm.y + cm.h, cm.x + cm.w, cm.y + cm.h - l);
    }

    for (let box of this.boxes) {
      if (!box.active) continue;
      let pulse = 0.85 + 0.15 * p.sin(this.t * box.pulse + box.phase);
      let dx = p.sin(this.t * box.drift * 0.3 + box.phase) * 2;
      let dy = p.cos(this.t * box.drift * 0.2 + box.phase) * 1.5;
      let bx = box.x + dx;
      let by = box.y + dy;
      let c = box.color;
      let a = 200 * pulse;

      g.noFill();
      g.strokeWeight(box.strokeW);

      if (box.style === "full") {
        g.stroke(c[0], c[1], c[2], a);
        g.rect(bx, by, box.w, box.h);
      } else {
        g.stroke(c[0], c[1], c[2], a);
        let cl = p.min(box.w, box.h) * 0.25;
        g.line(bx, by, bx + cl, by);
        g.line(bx, by, bx, by + cl);
        g.line(bx + box.w, by, bx + box.w - cl, by);
        g.line(bx + box.w, by, bx + box.w, by + cl);
        g.line(bx, by + box.h, bx + cl, by + box.h);
        g.line(bx, by + box.h, bx, by + box.h - cl);
        g.line(bx + box.w, by + box.h, bx + box.w - cl, by + box.h);
        g.line(bx + box.w, by + box.h, bx + box.w, by + box.h - cl);
      }

      let labelText = box.label + "  " + box.conf + "%";
      g.textFont("monospace");
      g.textSize(10);
      g.textAlign(p.LEFT, p.TOP);
      let tw = g.textWidth(labelText) + 8;
      let th = 14;
      let ly = by - th - 2;
      if (ly < 2) ly = by + 2;

      g.noStroke();
      g.fill(c[0], c[1], c[2], a * 0.9);
      g.rect(bx, ly, tw, th);

      g.fill(0, 0, 0, a + 30);
      g.text(labelText, bx + 4, ly + 2);

      g.fill(c[0], c[1], c[2], a * 0.5);
      g.textSize(7);
      g.text("ID:" + box.id, bx + box.w - 35, by + box.h + 3);

      if (box.confBar) {
        let barW = box.w * 0.6;
        let barH = 3;
        let barX = bx;
        let barY = by + box.h + 2;
        g.noStroke();
        g.fill(60, 65, 75, a * 0.5);
        g.rect(barX, barY, barW, barH);
        g.fill(c[0], c[1], c[2], a * 0.8);
        g.rect(barX, barY, barW * box.conf / 100, barH);
      }

      if (p.random() < 0.02 || (box.conf > 80 && p.sin(this.t + box.phase) > 0.5)) {
        let cx = bx + box.w / 2;
        let cy = by + box.h / 2;
        g.stroke(c[0], c[1], c[2], a * 0.4);
        g.strokeWeight(0.5);
        g.line(cx - 8, cy, cx + 8, cy);
        g.line(cx, cy - 8, cx, cy + 8);
      }
    }

    let scanAlpha = 60;
    g.stroke(100, 240, 80, scanAlpha);
    g.strokeWeight(1);
    g.line(0, this.scanY, this.w, this.scanY);
    for (let i = 1; i < 15; i++) {
      let sa = scanAlpha * (1 - i / 15);
      g.stroke(100, 240, 80, sa);
      g.line(0, this.scanY - i * 2, this.w, this.scanY - i * 2);
    }

    for (let dl of this.dataLabels) {
      let a = dl.alpha + 10 * p.sin(this.t + dl.phase);
      g.fill(100, 240, 80, a);
      g.noStroke();
      g.textFont("monospace");
      g.textSize(dl.size);
      g.textAlign(p.LEFT, p.TOP);
      if (dl.vertical) {
        g.push();
        g.translate(dl.x, dl.y);
        g.rotate(p.HALF_PI);
        g.text(dl.text, 0, 0);
        g.pop();
      } else {
        let txt = dl.text;
        if (txt.includes("####")) {
          txt = txt.replace("####", String(p.floor(this.t * 30) % 9999).padStart(4, '0'));
        }
        g.text(txt, dl.x, dl.y);
      }
    }

    this._drawHUD(g);
    return g;
  }

  _drawHUD(g: any) {
    const p = this.p;
    let a = 140 + 30 * p.sin(this.t);
    g.stroke(100, 240, 80, a * 0.6);
    g.strokeWeight(2);
    g.noFill();

    let margin = 15, cLen = 50;
    g.line(margin, margin, margin + cLen, margin);
    g.line(margin, margin, margin, margin + cLen);
    g.line(this.w - margin, margin, this.w - margin - cLen, margin);
    g.line(this.w - margin, margin, this.w - margin, margin + cLen);
    g.line(margin, this.h - margin, margin + cLen, this.h - margin);
    g.line(margin, this.h - margin, margin, this.h - margin - cLen);
    g.line(this.w - margin, this.h - margin, this.w - margin - cLen, this.h - margin);
    g.line(this.w - margin, this.h - margin, this.w - margin, this.h - margin - cLen);

    g.fill(100, 240, 80, a * 0.7);
    g.noStroke();
    g.textFont("monospace");
    g.textSize(9);
    g.textAlign(p.LEFT, p.TOP);
    let frameNum = String(p.floor(this.t * 30) % 99999).padStart(5, '0');
    g.text("■ LIVE  FRAME:" + frameNum, margin + 5, margin + 8);
    g.text("MODEL: YOLOv8-xl  |  CONF: 0.25  |  NMS: 0.45", margin + 5, margin + 20);

    g.textAlign(p.RIGHT, p.BOTTOM);
    g.fill(100, 240, 80, a * 0.5);
    g.textSize(8);
    g.text("DETECTIONS: " + this.boxes.filter((b: any) => b.active).length + "  |  GPU: 78%  |  " + p.floor(30 + p.sin(this.t) * 3) + " FPS", this.w - margin - 5, this.h - margin - 5);

    g.textAlign(p.RIGHT, p.TOP);
    g.fill(255, 200, 0, a * 0.6);
    g.textSize(8);
    let h = p.floor(this.t / 3600) % 24;
    let m = p.floor(this.t / 60) % 60;
    let s = p.floor(this.t) % 60;
    g.text(String(h).padStart(2, '0') + ":" + String(m).padStart(2, '0') + ":" + String(s).padStart(2, '0') + " UTC", this.w - margin - 5, margin + 8);

    let cx = this.w / 2, cy = this.h / 2;
    g.stroke(255, 255, 255, 20);
    g.strokeWeight(0.5);
    g.line(cx - 20, cy, cx + 20, cy);
    g.line(cx, cy - 20, cx, cy + 20);
  }

  _dashedLine(g: any, x1: number, y1: number, x2: number, y2: number, dashLen: number, gapLen: number) {
    const p = this.p;
    let d = p.dist(x1, y1, x2, y2);
    let steps = p.floor(d / (dashLen + gapLen));
    let dx = (x2 - x1) / d;
    let dy = (y2 - y1) / d;
    for (let i = 0; i < steps; i++) {
      let sx = x1 + dx * i * (dashLen + gapLen);
      let sy = y1 + dy * i * (dashLen + gapLen);
      g.line(sx, sy, sx + dx * dashLen, sy + dy * dashLen);
    }
  }
}
