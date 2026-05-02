// @ts-nocheck
import type p5 from "p5";

class NetomatLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  streams: any[];
  fragments: any[];
  waveforms: any[];
  t: number;
  textPool: string[];

  constructor(w: number, h: number, p: p5, textPool?: string[]) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.streams = [];
    this.fragments = [];
    this.waveforms = [];
    this.t = 0;
    this.textPool = textPool ?? [
      "Fireworks Splice HTML...", "<B>Museum</B>", "Background/Information",
      "New Exhibition", "Where have you been?", "memory:17.34",
      "speed:563", "txt:10  img:10  snd:1", "checkout exhibit",
      "The <B>Museum</B> of", "http://", "loading...",
      "404 not found", "connection reset", "data stream",
      "packet loss: 0.3%", "resolving host...", "cache expired",
      "content-type: text/html", "transfer-encoding: chunked",
      "the unexplored internet", "cultural concepts", "subconscious",
      "network interprets", "audio-visual language", "free information",
      "copyleft", "open source", "redistribution", "source code",
      "hack the system", "decentralize", "peer-to-peer",
      "autonomous zone", "tactical media", "digital commons"
    ];
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    for (let i = 0; i < 30; i++) {
      this.fragments.push({
        text: this.p.random(this.textPool),
        x: this.p.random(this.w),
        y: this.p.random(this.h),
        vx: this.p.random(-2, 2),
        vy: this.p.random(-1.5, 1.5),
        size: this.p.random(9, 22),
        alpha: this.p.random(80, 230),
        color: this.p.random() > 0.5 ? [180, 180, 175] : [100, 240, 80],
        life: this.p.random(200, 600),
        maxLife: 600,
        born: 0
      });
    }

    for (let i = 0; i < 6; i++) {
      this.streams.push({
        x: this.p.random(this.w),
        y: this.p.random(-100, this.h),
        w: this.p.random(40, 120),
        h: this.p.random(30, 80),
        vy: this.p.random(0.3, 1.5),
        type: this.p.floor(this.p.random(3)),
        alpha: this.p.random(100, 200)
      });
    }

    for (let i = 0; i < 4; i++) {
      this.waveforms.push({
        x: this.p.random(this.w * 0.1, this.w * 0.9),
        y: this.p.random(this.h),
        w: this.p.random(80, 200),
        phase: this.p.random(this.p.TWO_PI),
        speed: this.p.random(0.02, 0.06),
        amp: this.p.random(5, 20),
        alpha: this.p.random(80, 160)
      });
    }
  }

  update() {
    this.t++;

    for (let f of this.fragments) {
      f.x += f.vx;
      f.y += f.vy;
      f.born++;

      if (f.x < -100 || f.x > this.w + 100 || f.y < -50 || f.y > this.h + 50 || f.born > f.life) {
        f.x = this.p.random() > 0.5 ? this.p.random(this.w) : (this.p.random() > 0.5 ? -80 : this.w + 20);
        f.y = this.p.random() > 0.5 ? this.p.random(this.h) : -30;
        f.vx = this.p.random(-2, 2);
        f.vy = this.p.random(-1.5, 1.5);
        f.born = 0;
        f.alpha = this.p.random(80, 230);
      }
    }

    for (let s of this.streams) {
      s.y += s.vy;
      if (s.y > this.h + 100) {
        s.y = this.p.random(-150, -50);
        s.x = this.p.random(this.w);
      }
    }
  }

  render() {
    let g = this.buf!;
    g.clear();

    for (let wf of this.waveforms) {
      g.noFill();
      g.stroke(100, 240, 80, wf.alpha);
      g.strokeWeight(1);
      g.beginShape();
      for (let i = 0; i < wf.w; i += 2) {
        let yy = wf.y + this.p.sin(wf.phase + i * 0.1 + this.t * wf.speed) * wf.amp;
        g.vertex(wf.x + i, yy);
      }
      g.endShape();
    }

    for (let s of this.streams) {
      this._drawStreamObject(g, s);
    }

    g.textFont("monospace");
    for (let f of this.fragments) {
      let fadeIn = this.p.min(f.born / 30, 1);
      let fadeOut = f.born > f.life - 60 ? this.p.map(f.born, f.life - 60, f.life, 1, 0) : 1;
      let a = f.alpha * fadeIn * fadeOut;

      g.noStroke();
      g.fill(f.color[0], f.color[1], f.color[2], a);
      g.textSize(f.size);
      g.text(f.text, f.x, f.y);
    }

    g.noStroke();
    g.fill(100, 240, 80, 180);
    g.textSize(10);
    g.textFont("monospace");
    let statusY = this.h - 12;
    g.fill(40, 40, 40, 160);
    g.rect(0, statusY - 4, this.w, 16);
    g.fill(100, 240, 80, 200);
    g.text(
      `Where have you been?   memory:${this.p.floor(this.p.random(10,99))}.${this.p.floor(this.p.random(10,99))}   speed:${this.p.floor(this.p.random(100,999))}          txt:${this.p.floor(this.p.random(5,20))}  img:${this.p.floor(this.p.random(5,20))}  snd:${this.p.floor(this.p.random(1,5))}`,
      8, statusY + 8
    );

    return g;
  }

  _drawStreamObject(g: p5.Graphics, s: any) {
    switch (s.type) {
      case 0:
        g.noFill();
        g.stroke(180, 180, 175, s.alpha);
        g.strokeWeight(0.5);
        g.rect(s.x, s.y, s.w, s.h);
        for (let i = 0; i < 3; i++) {
          let lx = s.x + 4;
          let ly = s.y + 8 + i * 12;
          g.stroke(120, 120, 120, s.alpha * 0.7);
          g.line(lx, ly, lx + this.p.random(20, s.w - 8), ly);
        }
        break;

      case 1:
        g.noStroke();
        g.fill(80, 80, 80, s.alpha * 0.6);
        g.rect(s.x, s.y, s.w, s.h);
        g.stroke(120, 120, 120, s.alpha);
        g.strokeWeight(0.5);
        g.line(s.x, s.y, s.x + s.w, s.y + s.h);
        g.line(s.x + s.w, s.y, s.x, s.y + s.h);
        g.noFill();
        g.rect(s.x, s.y, s.w, s.h);
        break;

      case 2:
        g.noFill();
        g.stroke(100, 240, 80, s.alpha * 0.5);
        g.strokeWeight(1);
        g.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w * 0.6, s.h * 0.6);
        g.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w * 0.3, s.h * 0.3);
        break;
    }
  }
}

export default NetomatLayer;
