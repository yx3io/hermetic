// @ts-nocheck
import type p5 from "p5";

class TreeDiagramLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  nodes: any[];
  edges: any[];
  gridNodes: any[];
  t: number;
  labels: string[];

  constructor(w: number, h: number, p: p5, labels?: string[]) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.nodes = [];
    this.edges = [];
    this.gridNodes = [];
    this.t = 0;
    this.labels = labels ?? [
      "Table", "Cell", "Row", "Column", "Content type", "Interaction",
      "Actions", "Width", "Filter", "Sort", "Resize", "Top bar",
      "Title", "Command", "State", "Keyboard", "Error", "Data",
      "Input", "Output", "Node", "Edge", "Graph", "Layout",
      "Render", "Update", "Init", "Config", "Cache", "Stream"
    ];
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let roots = [
      { x: this.w * 0.12, y: 50 },
      { x: this.w * 0.45, y: 40 },
      { x: this.w * 0.78, y: 55 },
      { x: this.w * 0.25, y: this.h * 0.45 },
      { x: this.w * 0.65, y: this.h * 0.42 },
    ];

    for (let root of roots) {
      this._buildTree(root.x, root.y, 0, this.p.floor(this.p.random(3, 5)), -1);
    }

    this._buildGridNodes(this.w * 0.1, this.h * 0.75, this.p.floor(this.p.random(3, 5)), this.p.floor(this.p.random(3, 4)));
    this._buildGridNodes(this.w * 0.6, this.h * 0.7, this.p.floor(this.p.random(3, 6)), this.p.floor(this.p.random(2, 4)));
  }

  _buildTree(x: number, y: number, depth: number, maxDepth: number, parentIdx: number) {
    if (depth > maxDepth) return;
    if (x < 10 || x > this.w - 10 || y > this.h - 20) return;

    let idx = this.nodes.length;
    this.nodes.push({
      x, y,
      label: this.labels[this.p.floor(this.p.random(this.labels.length))],
      depth
    });

    if (parentIdx >= 0) {
      this.edges.push({ from: parentIdx, to: idx });
    }

    let childCount = depth === 0 ? this.p.floor(this.p.random(3, 5)) : this.p.floor(this.p.random(2, 4));
    if (depth >= maxDepth - 1) childCount = this.p.floor(this.p.random(1, 3));

    let spacing = this.p.map(depth, 0, maxDepth, 90, 35);
    let spread = childCount * spacing;
    let startX = x - spread / 2;

    for (let i = 0; i < childCount; i++) {
      let cx = startX + i * spacing + this.p.random(-8, 8);
      let cy = y + this.p.random(40, 65);
      this._buildTree(cx, cy, depth + 1, maxDepth, idx);
    }
  }

  _buildGridNodes(ox: number, oy: number, cols: number, rows: number) {
    let spacingX = this.p.random(45, 65);
    let spacingY = this.p.random(45, 65);
    let startIdx = this.gridNodes.length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.gridNodes.push({
          x: ox + c * spacingX,
          y: oy + r * spacingY,
          id: this.gridNodes.length,
          col: c, row: r,
          totalCols: cols, totalRows: rows,
          groupOx: ox, groupOy: oy,
          spacingX, spacingY
        });
      }
    }
  }

  update() {
    this.t += 0.005;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.textFont("monospace");

    g.stroke(80, 80, 90, 160);
    g.strokeWeight(1);
    for (let e of this.edges) {
      let p = this.nodes[e.from];
      let n = this.nodes[e.to];
      g.line(p.x, p.y + 8, p.x, p.y + 18);
      g.line(p.x, p.y + 18, n.x, p.y + 18);
      g.line(n.x, p.y + 18, n.x, n.y - 4);
    }

    g.noStroke();
    for (let node of this.nodes) {
      let a = 180 + this.p.sin(this.t * 2 + node.depth) * 30;
      g.fill(180, 180, 175, a);
      g.textSize(node.depth === 0 ? 12 : 9);
      g.textAlign(this.p.LEFT, this.p.CENTER);
      g.text(node.label, node.x + 4, node.y);

      g.stroke(120, 120, 120, 120);
      g.strokeWeight(0.5);
      g.line(node.x - 2, node.y, node.x + 2, node.y);
      g.noStroke();
    }

    g.stroke(50, 50, 220, 140);
    g.strokeWeight(1.5);
    for (let n of this.gridNodes) {
      let right = this.gridNodes.find((o: any) =>
        o.groupOx === n.groupOx && o.row === n.row && o.col === n.col + 1
      );
      if (right) g.line(n.x, n.y, right.x, right.y);

      let down = this.gridNodes.find((o: any) =>
        o.groupOx === n.groupOx && o.col === n.col && o.row === n.row + 1
      );
      if (down) g.line(n.x, n.y, down.x, down.y);
    }

    g.textAlign(this.p.CENTER, this.p.CENTER);
    g.noStroke();
    for (let n of this.gridNodes) {
      g.fill(50, 50, 220, 200);
      g.textSize(14);
      g.textStyle(this.p.ITALIC);
      g.text(n.id, n.x, n.y);
    }
    g.textStyle(this.p.NORMAL);

    let groups: Record<string, any> = {};
    for (let n of this.gridNodes) {
      let key = n.groupOx + "," + n.groupOy;
      if (!groups[key]) groups[key] = n;
    }
    g.fill(50, 50, 220, 120);
    g.textSize(12);
    for (let key in groups) {
      let n = groups[key];
      g.text("x", n.groupOx + n.totalCols * n.spacingX + 20, n.groupOy);
      g.text("y", n.groupOx, n.groupOy + n.totalRows * n.spacingY + 20);
    }

    return g;
  }
}

export default TreeDiagramLayer;
