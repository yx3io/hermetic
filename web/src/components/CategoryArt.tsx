"use client";

import { useEffect, useRef } from "react";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function sr(seed: number, i: number): number {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type PatternFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  count: number
) => void;

const concentricCircles: PatternFn = (ctx, w, h, seed, count) => {
  const cx = w / 2, cy = h / 2;
  const rings = 3 + (count % 6);
  for (let i = 0; i < rings; i++) {
    const r = (w * 0.1) + (i / rings) * w * 0.4;
    const alpha = 0.08 + sr(seed, i * 7) * 0.15;
    ctx.strokeStyle = `rgba(200,200,200,${alpha})`;
    ctx.lineWidth = 0.5 + sr(seed, i * 7 + 1) * 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(200,200,200,0.2)";
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
};

const gridPattern: PatternFn = (ctx, w, h, seed, count) => {
  const cols = 4 + (count % 5);
  const rows = 4 + ((count + 2) % 4);
  const cw = w / (cols + 1), rh = h / (rows + 1);
  for (let c = 1; c <= cols; c++) {
    for (let r = 1; r <= rows; r++) {
      const v = sr(seed, c * 13 + r * 7);
      if (v < 0.3) continue;
      const alpha = 0.05 + v * 0.18;
      const sz = cw * 0.3 + v * cw * 0.4;
      ctx.fillStyle = `rgba(200,200,200,${alpha})`;
      ctx.fillRect(c * cw - sz / 2, r * rh - sz / 2, sz, sz);
    }
  }
};

const flowingLines: PatternFn = (ctx, w, h, seed, count) => {
  const n = 4 + (count % 6);
  for (let i = 0; i < n; i++) {
    const baseY = (h * 0.15) + (i / n) * h * 0.7;
    const alpha = 0.08 + sr(seed, i * 11) * 0.14;
    ctx.strokeStyle = `rgba(200,200,200,${alpha})`;
    ctx.lineWidth = 0.5 + sr(seed, i * 11 + 1) * 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y =
        baseY +
        Math.sin(x * 0.05 + i * 2 + seed * 0.1) * 8 +
        Math.sin(x * 0.02 + seed * 0.3) * 5;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
};

const crosshatch: PatternFn = (ctx, w, h, seed, count) => {
  const n = 5 + (count % 8);
  const alpha = 0.06 + sr(seed, 1) * 0.1;
  ctx.strokeStyle = `rgba(200,200,200,${alpha})`;
  ctx.lineWidth = 0.4;
  for (let i = 0; i < n; i++) {
    const x1 = sr(seed, i * 5) * w;
    const y1 = sr(seed, i * 5 + 1) * h;
    const x2 = sr(seed, i * 5 + 2) * w;
    const y2 = sr(seed, i * 5 + 3) * h;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  for (let i = 0; i < Math.min(count, 12); i++) {
    const cx = sr(seed, i * 3 + 100) * w;
    const cy = sr(seed, i * 3 + 101) * h;
    ctx.fillStyle = `rgba(200,200,200,${0.1 + sr(seed, i + 200) * 0.15})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
};

const steppedBars: PatternFn = (ctx, w, h, seed, count) => {
  const n = Math.min(count, 16) || 5;
  const barW = w / (n + 1);
  for (let i = 0; i < n; i++) {
    const barH = (0.2 + sr(seed, i * 7) * 0.7) * h * 0.8;
    const alpha = 0.06 + sr(seed, i * 7 + 1) * 0.16;
    ctx.fillStyle = `rgba(200,200,200,${alpha})`;
    ctx.fillRect(
      (i + 0.5) * barW,
      h - barH - h * 0.05,
      barW * 0.7,
      barH
    );
  }
};

const dotField: PatternFn = (ctx, w, h, seed, count) => {
  const n = 15 + (count % 20);
  for (let i = 0; i < n; i++) {
    const x = sr(seed, i * 11) * w;
    const y = sr(seed, i * 11 + 1) * h;
    const sz = 0.5 + sr(seed, i * 11 + 2) * 3;
    const alpha = 0.08 + sr(seed, i * 11 + 3) * 0.2;
    ctx.fillStyle = `rgba(200,200,200,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI * 2);
    ctx.fill();
  }
};

const PATTERNS: PatternFn[] = [
  concentricCircles,
  gridPattern,
  flowingLines,
  crosshatch,
  steppedBars,
  dotField,
];

interface Props {
  category: string;
  skillCount: number;
  size?: number;
}

export default function CategoryArt({ category, skillCount, size = 80 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    const seed = hash(category);
    const patternIdx = seed % PATTERNS.length;
    PATTERNS[patternIdx](ctx, size, size, seed, skillCount);
  }, [category, skillCount, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className="opacity-70 group-hover:opacity-100 transition-opacity"
    />
  );
}
