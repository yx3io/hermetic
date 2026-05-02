// @ts-nocheck
import type p5 from "p5";

class BrowserCollageLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  windows: any[];
  cursors: any[];
  glitchBlocks: any[];
  scrollOffsets: any[];
  flickerT: number;
  titles: string[];

  constructor(w: number, h: number, p: p5, titles?: string[]) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.windows = [];
    this.cursors = [];
    this.glitchBlocks = [];
    this.scrollOffsets = [];
    this.flickerT = 0;
    this.titles = titles ?? [
      "Index of /~you", "Netscape Navigator", "File Manager",
      "http://010010111...", "untitled - notepad", "Terminal",
      "explorer.exe", "Index of /root", "VRML World",
      "mail - inbox (43)", "art.net/~user", "cache/tmp"
    ];
  }

  init(windowCount = 8) {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let palette = [
      [50, 50, 220], [100, 240, 80], [255, 200, 0],
      [240, 80, 130], [180, 180, 175], [0, 0, 0]
    ];

    for (let i = 0; i < windowCount; i++) {
      let ww = this.p.random(160, 380);
      let wh = this.p.random(120, 300);
      this.windows.push({
        x: this.p.random(-40, this.w - ww + 40),
        y: this.p.random(-20, this.h - wh + 40),
        w: ww,
        h: wh,
        titleBar: this._randomTitle(),
        bgColor: this.p.random(palette),
        contentType: this.p.floor(this.p.random(4)),
        scrollY: 0,
        scrollSpeed: this.p.random(0.2, 1.2),
        stripePhase: this.p.random(this.p.TWO_PI),
        depth: i
      });
    }

    for (let i = 0; i < 5; i++) {
      let s = this.p.random(30, 80);
      this.cursors.push({
        x: this.p.random(this.w),
        y: this.p.random(this.h),
        size: s,
        rot: this.p.random(-0.3, 0.3),
        alpha: this.p.random(120, 220)
      });
    }

    for (let i = 0; i < 25; i++) {
      this.glitchBlocks.push({
        x: this.p.random(this.w),
        y: this.p.random(this.h),
        w: this.p.random(8, 60),
        h: this.p.random(4, 20),
        color: this.p.random(palette),
        alpha: this.p.random(60, 180),
        blinkRate: this.p.random(0.01, 0.05)
      });
    }
  }

  _randomTitle() {
    return this.p.random(this.titles);
  }

  update() {
    this.flickerT += 0.02;
    for (let win of this.windows) {
      win.scrollY += win.scrollSpeed;
      if (win.scrollY > 400) win.scrollY = 0;
    }
  }

  render() {
    let g = this.buf!;
    g.clear();

    for (let win of this.windows) {
      this._drawWindow(g, win);
    }

    for (let gb of this.glitchBlocks) {
      let flicker = this.p.sin(this.flickerT * 60 * gb.blinkRate) > 0.3;
      if (flicker) {
        g.noStroke();
        g.fill(gb.color[0], gb.color[1], gb.color[2], gb.alpha);
        g.rect(gb.x, gb.y, gb.w, gb.h);
      }
    }

    for (let c of this.cursors) {
      this._drawPixelCursor(g, c.x, c.y, c.size, c.rot, c.alpha);
    }

    return g;
  }

  _drawWindow(g: p5.Graphics, win: any) {
    g.stroke(160);
    g.strokeWeight(1);
    g.fill(200, 200, 200, 200);
    g.rect(win.x, win.y, win.w, win.h);

    g.fill(50, 50, 220);
    g.noStroke();
    g.rect(win.x + 2, win.y + 2, win.w - 4, 18);

    g.fill(255);
    g.textSize(10);
    g.textFont("monospace");
    g.textAlign(this.p.LEFT, this.p.CENTER);
    g.text(win.titleBar, win.x + 6, win.y + 11);

    let bx = win.x + win.w - 16;
    g.fill(192);
    g.stroke(0);
    g.strokeWeight(1);
    g.rect(bx, win.y + 3, 12, 12);
    g.line(bx + 3, win.y + 6, bx + 9, win.y + 12);
    g.line(bx + 9, win.y + 6, bx + 3, win.y + 12);

    g.noStroke();
    let cx = win.x + 3;
    let cy = win.y + 22;
    let cw = win.w - 6;
    let ch = win.h - 24;

    g.push();
    g.drawingContext.save();
    g.drawingContext.beginPath();
    g.drawingContext.rect(cx, cy, cw, ch);
    g.drawingContext.clip();

    switch (win.contentType) {
      case 0:
        this._drawStripes(g, cx, cy, cw, ch, win);
        break;
      case 1:
        this._drawDirectoryListing(g, cx, cy, cw, ch, win);
        break;
      case 2:
        this._drawHtmlSource(g, cx, cy, cw, ch, win);
        break;
      case 3:
        this._drawPixelGrid(g, cx, cy, cw, ch, win);
        break;
    }

    g.drawingContext.restore();
    g.pop();
  }

  _drawStripes(g: p5.Graphics, x: number, y: number, w: number, h: number, win: any) {
    let stripeW = 12;
    let colors = [[50, 50, 220], [100, 240, 80], [50, 50, 220]];
    for (let i = 0; i < w; i += stripeW) {
      let c = colors[this.p.floor(i / stripeW) % colors.length];
      g.fill(c[0], c[1], c[2], 180);
      g.rect(x + i, y, stripeW, h);
    }
    g.fill(0, 0, 0, 120);
    g.textSize(9);
    for (let row = 0; row < h; row += 12) {
      let line = "";
      for (let j = 0; j < 6; j++) line += " " + this.p.floor(this.p.random(255)).toString(16).padStart(2, '0');
      g.text(line, x + 4, y + row + 10 - (win.scrollY % 24));
    }
  }

  _drawDirectoryListing(g: p5.Graphics, x: number, y: number, w: number, h: number, win: any) {
    g.fill(255, 255, 255, 230);
    g.rect(x, y, w, h);

    let entries = [
      "drwxr-xr-x  art/", "drwxr-xr-x  data/", "-rw-r--r--  index.html",
      "-rw-r--r--  manifest.json", "drwxr-xr-x  cache/", "-rw-r--r--  style.css",
      "drwxr-xr-x  .hidden/", "-rw-r--r--  readme.txt", "-rw-r--r--  error.log",
      "drwxr-xr-x  images/", "-rw-r--r--  config.yml", "-rw-r--r--  robots.txt"
    ];

    g.fill(50, 50, 220);
    g.textSize(11);
    g.textFont("monospace");
    g.text("Index of /~you", x + 8, y + 14);

    g.fill(0);
    g.textSize(9);
    let startLine = this.p.floor(win.scrollY / 14) % entries.length;
    for (let i = 0; i < this.p.floor(h / 14); i++) {
      let entry = entries[(startLine + i) % entries.length];
      let yy = y + 28 + i * 14 - (win.scrollY % 14);
      if (entry.includes("/")) g.fill(50, 50, 220);
      else g.fill(0);
      g.text(entry, x + 8, yy);
    }
  }

  _drawHtmlSource(g: p5.Graphics, x: number, y: number, w: number, h: number, win: any) {
    g.fill(20, 20, 20, 240);
    g.rect(x, y, w, h);

    let lines = [
      '<html>', '  <head>', '    <title>010010</title>',
      '  </head>', '  <body bgcolor="#000">', '    <B>Museum</B>',
      '    <a href="exhibit">', '      new exhibition</a>',
      '    <img src="art.gif">', '    <hr>', '    <font color=green>',
      '      Background/Info', '    </font>', '    <!-- hidden -->',
      '    <table border=1>', '      <tr><td>data</td></tr>',
      '    </table>', '  </body>', '</html>'
    ];

    g.textSize(8);
    g.textFont("monospace");
    for (let i = 0; i < this.p.floor(h / 11); i++) {
      let lineIdx = (this.p.floor(win.scrollY / 11) + i) % lines.length;
      let yy = y + 10 + i * 11 - (win.scrollY % 11);
      let l = lines[lineIdx];
      if (l.includes("<B>") || l.includes("<a")) g.fill(100, 240, 80);
      else if (l.includes("<!--")) g.fill(120, 120, 120);
      else g.fill(100, 240, 80);
      g.text(l, x + 6, yy);
    }
  }

  _drawPixelGrid(g: p5.Graphics, x: number, y: number, w: number, h: number, win: any) {
    let cellSize = 10;
    let colors = [
      [240, 80, 130], [100, 240, 80], [50, 50, 220],
      [255, 200, 0], [180, 180, 175], [0, 0, 0]
    ];
    for (let row = 0; row < h; row += cellSize) {
      for (let col = 0; col < w; col += cellSize) {
        let c = colors[this.p.floor(this.p.random(colors.length))];
        let shift = this.p.sin((row + win.scrollY) * 0.05 + col * 0.03) * 40;
        g.fill(c[0] + shift, c[1] + shift, c[2] + shift, 200);
        g.rect(x + col, y + row, cellSize - 1, cellSize - 1);
      }
    }
  }

  _drawPixelCursor(g: p5.Graphics, x: number, y: number, size: number, rot: number, alpha: number) {
    g.push();
    g.translate(x, y);
    g.rotate(rot);
    g.noStroke();

    let cursorShape = [
      [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],
      [1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],
      [2,0],[2,1],[2,6],[2,7],
      [3,0],[3,7],[3,8],
      [4,0],[4,8],[4,9],
      [5,0],[5,9],[5,10],
      [6,0]
    ];

    let px = size / 12;
    g.fill(0, 0, 0, alpha);
    for (let pt of cursorShape) {
      g.rect(pt[1] * px, pt[0] * px, px + 0.5, px + 0.5);
    }
    g.fill(255, 255, 255, alpha * 0.9);
    let innerShape = [
      [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
      [2,2],[3,2],[4,2],[5,2],
      [3,3],[4,3],[5,3],
      [4,4],[5,4],
      [5,5]
    ];
    for (let pt of innerShape) {
      g.rect(pt[1] * px, pt[0] * px, px + 0.5, px + 0.5);
    }

    g.pop();
  }
}

export default BrowserCollageLayer;
