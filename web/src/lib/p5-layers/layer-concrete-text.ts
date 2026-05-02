// @ts-nocheck
import type p5 from "p5";

interface BaselineLine {
  text: string;
  size: number;
  x: number;
  y: number;
  hasGreenDot: boolean;
}

interface PoetryLine {
  text: string;
  strike: boolean;
  x: number;
  y: number;
}

interface CalendarDate {
  x: number;
  y: number;
  day: number;
  highlighted: boolean;
  month: string;
}

interface Shape {
  x: number;
  y: number;
  type: number;
  size: number;
  filled: boolean;
}

class ConcreteTextLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  baselineLines: BaselineLine[];
  poetryLines: PoetryLine[];
  calendarDates: CalendarDate[];
  shapes: Shape[];
  t: number;
  private baselineDefaults: { text: string; size: number }[];
  private poetryDefaults: { text: string; strike: boolean }[];

  constructor(
    w: number,
    h: number,
    p: p5,
    baseline: { text: string; size: number }[] = [
      { text: "CELLS.", size: 10 },
      { text: "CELLS.", size: 14 },
      { text: "INTERLINKED.", size: 12 },
      { text: "INTERLINKED.", size: 18 },
      { text: "INTERLINKED.", size: 24 },
      { text: "WITHIN CELLS INTERLINKED.", size: 16 },
      { text: "WITHIN CELLS INTERLINKED.", size: 22 },
      { text: "WITHIN CELLS INTERLINKED.", size: 28 },
    ],
    poetry: { text: string; strike: boolean }[] = [
      { text: "The art is the future,", strike: true },
      { text: "The future is the art,", strike: true },
      { text: "Tomorrow is the future", strike: false },
      { text: "Be strong to the future", strike: true },
      { text: "I'm    the    art,    I'm    the    future,", strike: false },
      { text: "I'm    the    skill,   I'm    the    teacher,", strike: false },
      { text: "Like    rivers    in    their    seasons,", strike: false },
      { text: "Colors of the truth,", strike: false },
    ]
  ) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.baselineLines = [];
    this.poetryLines = [];
    this.calendarDates = [];
    this.shapes = [];
    this.t = 0;
    this.baselineDefaults = baseline;
    this.poetryDefaults = poetry;
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let bx = this.p.random(this.w * 0.05, this.w * 0.3);
    let by = this.p.random(this.h * 0.05, this.h * 0.2);
    for (let i = 0; i < this.baselineDefaults.length; i++) {
      this.baselineLines.push({
        x: bx + this.p.random(-20, 100),
        y: by + i * 30,
        ...this.baselineDefaults[i],
        hasGreenDot: this.p.random() > 0.5,
      });
    }

    let py = this.p.random(this.h * 0.5, this.h * 0.6);
    for (let i = 0; i < this.poetryDefaults.length; i++) {
      this.poetryLines.push({
        x: this.p.random(20, 60),
        y: py + i * 16,
        ...this.poetryDefaults[i],
      });
    }

    let cx = this.p.random(this.w * 0.5, this.w * 0.7);
    let cy = this.p.random(this.h * 0.35, this.h * 0.55);
    for (let d = 1; d <= 31; d++) {
      let angle = this.p.map(d, 1, 31, -this.p.PI * 0.8, this.p.PI * 1.5);
      let r = this.p.map(d, 1, 31, 40, 130);
      this.calendarDates.push({
        x: cx + this.p.cos(angle) * r,
        y: cy + this.p.sin(angle) * r,
        day: d,
        highlighted: [5, 11, 12, 18, 19, 25, 26].includes(d),
        month: d <= 31 ? "" : "May",
      });
    }

    for (let i = 0; i < 15; i++) {
      this.shapes.push({
        x: this.p.random(this.w),
        y: this.p.random(this.h),
        type: this.p.floor(this.p.random(5)),
        size: this.p.random(8, 24),
        filled: this.p.random() > 0.6,
      });
    }
  }

  update() {
    this.t += 0.006;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.textFont("monospace");

    for (let line of this.baselineLines) {
      let a = 160 + this.p.sin(this.t * 3 + line.y * 0.01) * 50;
      g.noStroke();
      g.fill(210, 210, 220, a);
      g.textSize(line.size);
      g.textStyle(this.p.BOLD ? (line.size > 20 ? this.p.BOLD : this.p.NORMAL) : (line.size > 20 ? "bold" as any : "normal" as any));
      g.textAlign(this.p.LEFT, this.p.TOP);
      g.text(line.text, line.x, line.y);

      if (line.hasGreenDot) {
        g.fill(100, 240, 80, 180);
        g.ellipse(line.x + g.textWidth(line.text) + 8, line.y + line.size / 2, 6);
      }
    }
    g.textStyle(this.p.NORMAL as any);

    g.textSize(9);
    for (let line of this.poetryLines) {
      g.noStroke();
      g.fill(180, 180, 190, 140);
      g.textAlign(this.p.LEFT, this.p.TOP);
      g.text(line.text, line.x, line.y);

      if (line.strike) {
        g.stroke(180, 180, 190, 100);
        g.strokeWeight(0.7);
        let tw = g.textWidth(line.text);
        g.line(line.x, line.y + 5, line.x + tw, line.y + 5);
      }
    }

    g.textSize(10);
    g.textAlign(this.p.CENTER, this.p.CENTER);
    for (let d of this.calendarDates) {
      if (d.highlighted) {
        g.fill(40, 40, 40, 200);
        g.noStroke();
        g.ellipse(d.x, d.y, 18);
        g.fill(220, 220, 220, 220);
      } else {
        g.noStroke();
        g.fill(180, 180, 180, 140);
      }
      g.text(d.day, d.x, d.y);
    }

    if (this.calendarDates.length > 0) {
      let last = this.calendarDates[0];
      g.fill(160, 160, 160, 100);
      g.textSize(8);
      g.textAlign(this.p.LEFT);
      g.text("May", last.x + 40, last.y - 10);
    }

    g.strokeWeight(1);
    for (let s of this.shapes) {
      let a = 120 + this.p.sin(this.t + s.x * 0.01) * 40;
      if (s.filled) {
        g.fill(180, 180, 180, a);
        g.noStroke();
      } else {
        g.noFill();
        g.stroke(180, 180, 180, a);
      }

      switch (s.type) {
        case 0: g.rect(s.x, s.y, s.size, s.size); break;
        case 1: g.ellipse(s.x, s.y, s.size); break;
        case 2:
          g.line(s.x - s.size / 2, s.y, s.x + s.size / 2, s.y);
          g.line(s.x, s.y - s.size / 2, s.x, s.y + s.size / 2);
          break;
        case 3:
          g.noFill();
          g.stroke(180, 180, 180, a);
          g.beginShape();
          for (let i = 0; i < 12; i++) {
            let angle = (i / 12) * this.p.TWO_PI;
            let r = i % 2 === 0 ? s.size / 2 : s.size / 3;
            g.vertex(s.x + this.p.cos(angle) * r, s.y + this.p.sin(angle) * r);
          }
          g.endShape(this.p.CLOSE);
          break;
        case 4:
          g.push();
          g.translate(s.x, s.y);
          g.rect(0, 0, s.size, s.size);
          g.line(0, 0, s.size, s.size);
          g.pop();
          break;
      }
    }

    let grad = g.drawingContext;
    let linGrad = grad.createLinearGradient(this.w * 0.3, 0, this.w * 0.8, this.h);
    linGrad.addColorStop(0, "rgba(0,255,100,0.02)");
    linGrad.addColorStop(0.5, "rgba(0,255,100,0.05)");
    linGrad.addColorStop(1, "rgba(0,200,80,0.01)");
    grad.fillStyle = linGrad;
    grad.fillRect(0, 0, this.w, this.h);

    return g;
  }
}

export default ConcreteTextLayer;
