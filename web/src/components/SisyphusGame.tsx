"use client";

import { useEffect, useRef, useCallback } from "react";

const CANVAS_W = 800;
const CANVAS_H = 300;
const GROUND_Y = 260;
const SLOPE_ANGLE = 0.12;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const BASE_SPEED = 3.5;

const STICKMAN_COLOR = "#e8e8e8";
const ROCK_COLOR = "#5a5a5a";
const GROUND_COLOR = "#2a2a2a";
const OB_STROKE = "#3a3a3a";
const BG = "#080808";

type ObstacleType = "vase" | "flame" | "rock" | "trident";

type Obstacle = {
  x: number;
  type: ObstacleType;
  y: number;
  w: number;
  h: number;
  passed: boolean;
};

export default function SisyphusGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    running: false,
    gameOver: false,
    started: false,
    y: GROUND_Y,
    vy: 0,
    jumping: false,
    obstacles: [] as Obstacle[],
    spawnTimer: 0,
    score: 0,
    speed: BASE_SPEED,
    frame: 0,
    legPhase: 0,
    scrollX: 0,
  });

  const getGroundY = useCallback((x: number) => {
    return GROUND_Y - x * SLOPE_ANGLE;
  }, []);

  const spawnObstacle = useCallback(() => {
    const s = stateRef.current;
    const roll = Math.random();
    let ob: Obstacle;
    const baseX = CANVAS_W + 40;

    if (roll < 0.25) {
      ob = { x: baseX, type: "vase", y: 0, w: 18, h: 32, passed: false };
    } else if (roll < 0.5) {
      ob = { x: baseX, type: "flame", y: 0, w: 16, h: 32, passed: false };
    } else if (roll < 0.75) {
      ob = { x: baseX, type: "rock", y: 0, w: 28, h: 22, passed: false };
    } else {
      ob = { x: baseX, type: "trident", y: 0, w: 16, h: 38, passed: false };
    }

    ob.y = getGroundY(ob.x) - ob.h;
    s.obstacles.push(ob);
  }, [getGroundY]);

  const drawStickman = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, phase: number) => {
      const gY = y;
      ctx.save();
      ctx.strokeStyle = STICKMAN_COLOR;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";

      const headX = x - 2;
      const headY = gY - 34;
      const hipX = x - 8;
      const hipY = gY - 12;
      const shoulderX = x - 1;
      const shoulderY = gY - 26;

      ctx.beginPath();
      ctx.arc(headX, headY, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(hipX, hipY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(x + 10, gY - 28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(x + 10, gY - 22);
      ctx.stroke();

      const legSwing = Math.sin(phase) * 6;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(hipX - 4 + legSwing, gY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(hipX - 4 - legSwing, gY);
      ctx.stroke();

      ctx.restore();
    },
    []
  );

  const drawRock = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
      ctx.save();
      ctx.fillStyle = ROCK_COLOR;

      ctx.beginPath();
      const segs = 8;
      const offsets = [0.95, 1.07, 0.93, 1.05, 0.97, 1.04, 0.92, 1.06];
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        const amid = (a0 + a1) / 2;
        const r0 = r * offsets[i];
        const r1 = r * offsets[(i + 1) % segs];
        const rmid = r * (offsets[i] + offsets[(i + 1) % segs]) / 2 * 1.02;

        const x0 = cx + Math.cos(a0) * r0;
        const y0 = cy + Math.sin(a0) * r0;
        const cpx = cx + Math.cos(amid) * rmid;
        const cpy = cy + Math.sin(amid) * rmid;
        const x1 = cx + Math.cos(a1) * r1;
        const y1 = cy + Math.sin(a1) * r1;

        if (i === 0) ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cpx, cpy, x1, y1);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#4a4a4a";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.strokeStyle = "#4e4e4e";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.25, cy - r * 0.15);
      ctx.quadraticCurveTo(cx, cy + r * 0.1, cx + r * 0.2, cy - r * 0.05);
      ctx.stroke();

      ctx.restore();
    },
    []
  );

  const drawVase = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      ctx.save();
      const cx = x + w / 2;
      ctx.strokeStyle = OB_STROKE;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(cx - 5, y + 6);
      ctx.quadraticCurveTo(cx - w / 2 - 4, y + 4, cx - w / 2 - 2, y + h * 0.3);
      ctx.quadraticCurveTo(cx - w / 2 - 3, y + h * 0.45, cx - 6, y + h * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 5, y + 6);
      ctx.quadraticCurveTo(cx + w / 2 + 4, y + 4, cx + w / 2 + 2, y + h * 0.3);
      ctx.quadraticCurveTo(cx + w / 2 + 3, y + h * 0.45, cx + 6, y + h * 0.35);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 3, y);
      ctx.lineTo(cx - 2, y + 3);
      ctx.lineTo(cx - 5, y + 6);
      ctx.quadraticCurveTo(cx - w / 2 - 1, y + h * 0.5, cx - w / 2 + 2, y + h - 5);
      ctx.lineTo(cx - 4, y + h);
      ctx.lineTo(cx + 4, y + h);
      ctx.lineTo(cx + w / 2 - 2, y + h - 5);
      ctx.quadraticCurveTo(cx + w / 2 + 1, y + h * 0.5, cx + 5, y + 6);
      ctx.lineTo(cx + 2, y + 3);
      ctx.lineTo(cx + 3, y);
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = "#2e2e2e";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - 5, y + h * 0.35);
      ctx.lineTo(cx + 5, y + h * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 6, y + h * 0.55);
      ctx.lineTo(cx + 6, y + h * 0.55);
      ctx.stroke();

      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 3; i++) {
        const px = cx - 4 + i * 4;
        const py = y + h * 0.43;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 2, py);
        ctx.lineTo(px + 2, py + 2);
        ctx.lineTo(px, py + 2);
        ctx.stroke();
      }

      ctx.restore();
    },
    []
  );

  const drawFlame = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) => {
      ctx.save();
      const cx = x + w / 2;
      const f1 = Math.sin(frame * 0.2) * 2.5;
      const f2 = Math.cos(frame * 0.3) * 2;
      const f3 = Math.sin(frame * 0.15 + 1) * 1.8;
      const f4 = Math.cos(frame * 0.25 + 2) * 1.5;

      ctx.strokeStyle = OB_STROKE;
      ctx.lineWidth = 1.3;
      ctx.lineCap = "round";

      // outer flame silhouette
      ctx.beginPath();
      ctx.moveTo(cx - 5, y + h);
      ctx.quadraticCurveTo(cx - 7 + f3, y + h * 0.6, cx - 4 + f1, y + h * 0.3);
      ctx.quadraticCurveTo(cx - 2 + f2, y + h * 0.1, cx + f1 * 0.5, y);
      ctx.quadraticCurveTo(cx + 2 - f2, y + h * 0.1, cx + 4 - f1, y + h * 0.3);
      ctx.quadraticCurveTo(cx + 7 - f3, y + h * 0.6, cx + 5, y + h);
      ctx.stroke();

      // inner flame
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 2, y + h * 0.85);
      ctx.quadraticCurveTo(cx - 3 + f2, y + h * 0.5, cx + f4, y + h * 0.18);
      ctx.quadraticCurveTo(cx + 3 - f2, y + h * 0.5, cx + 2, y + h * 0.85);
      ctx.stroke();

      // dancing wisps
      ctx.strokeStyle = "#2e2e2e";
      ctx.lineWidth = 0.8;

      ctx.beginPath();
      ctx.moveTo(cx - 3, y + h * 0.7);
      ctx.quadraticCurveTo(cx - 5 + f4, y + h * 0.4, cx - 1 + f2, y + h * 0.15);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 3, y + h * 0.7);
      ctx.quadraticCurveTo(cx + 5 - f4, y + h * 0.4, cx + 1 - f1, y + h * 0.12);
      ctx.stroke();

      // tip flicker
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(cx + f1 * 0.5, y);
      ctx.quadraticCurveTo(cx + f2, y - 5, cx + f3 * 0.8, y - 8 + Math.abs(f1));
      ctx.stroke();

      // sparks
      ctx.fillStyle = "#333";
      ctx.fillRect(cx - 4 + f1, y + h * 0.2 + f3, 1, 1);
      ctx.fillRect(cx + 3 - f2, y + h * 0.1 - f4, 1, 1);
      ctx.fillRect(cx + f4, y - 3 + Math.abs(f1), 1, 1);

      ctx.restore();
    },
    []
  );

  const drawSmallRock = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      ctx.save();
      ctx.strokeStyle = OB_STROKE;
      ctx.lineWidth = 1.5;

      // jagged pointy rock
      ctx.beginPath();
      ctx.moveTo(x + 2, y + h);
      ctx.lineTo(x, y + h * 0.55);
      ctx.lineTo(x + w * 0.12, y + h * 0.35);
      ctx.lineTo(x + w * 0.25, y + 3);
      ctx.lineTo(x + w * 0.35, y + h * 0.2);
      ctx.lineTo(x + w * 0.48, y - 2);
      ctx.lineTo(x + w * 0.58, y + h * 0.15);
      ctx.lineTo(x + w * 0.72, y + 1);
      ctx.lineTo(x + w * 0.82, y + h * 0.25);
      ctx.lineTo(x + w, y + h * 0.45);
      ctx.lineTo(x + w - 1, y + h);
      ctx.closePath();
      ctx.stroke();

      // crack lines
      ctx.strokeStyle = "#2e2e2e";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.48, y - 2);
      ctx.lineTo(x + w * 0.45, y + h * 0.5);
      ctx.lineTo(x + w * 0.38, y + h * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, y + 3);
      ctx.lineTo(x + w * 0.3, y + h * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.72, y + 1);
      ctx.lineTo(x + w * 0.68, y + h * 0.5);
      ctx.stroke();

      ctx.restore();
    },
    []
  );

  const drawTrident = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      ctx.save();
      ctx.strokeStyle = OB_STROKE;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";

      const cx = x + w / 2;

      // shaft
      ctx.beginPath();
      ctx.moveTo(cx, y + h);
      ctx.lineTo(cx, y + h * 0.3);
      ctx.stroke();

      // center prong
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.3);
      ctx.lineTo(cx, y);
      ctx.stroke();

      // left prong
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.3);
      ctx.quadraticCurveTo(cx - 3, y + h * 0.22, cx - 6, y + h * 0.15);
      ctx.lineTo(cx - 7, y + 2);
      ctx.stroke();
      // left barb
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 7, y + 2);
      ctx.lineTo(cx - 9, y + 6);
      ctx.stroke();

      // right prong
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.3);
      ctx.quadraticCurveTo(cx + 3, y + h * 0.22, cx + 6, y + h * 0.15);
      ctx.lineTo(cx + 7, y + 2);
      ctx.stroke();
      // right barb
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 7, y + 2);
      ctx.lineTo(cx + 9, y + 6);
      ctx.stroke();

      // center barbs
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx - 2, y + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx + 2, y + 4);
      ctx.stroke();

      // crossguard
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cx - 4, y + h * 0.32);
      ctx.lineTo(cx + 4, y + h * 0.32);
      ctx.stroke();

      // grip wrap detail
      ctx.strokeStyle = "#2e2e2e";
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 4; i++) {
        const gy = y + h * 0.55 + i * 5;
        ctx.beginPath();
        ctx.moveTo(cx - 2, gy);
        ctx.lineTo(cx + 2, gy + 2);
        ctx.stroke();
      }

      ctx.restore();
    },
    []
  );

  const reset = useCallback(() => {
    const s = stateRef.current;
    s.y = GROUND_Y;
    s.vy = 0;
    s.jumping = false;
    s.obstacles = [];
    s.spawnTimer = 0;
    s.score = 0;
    s.speed = BASE_SPEED;
    s.frame = 0;
    s.legPhase = 0;
    s.scrollX = 0;
    s.gameOver = false;
    s.running = true;
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    if (!s.running) return;

    s.frame++;
    s.scrollX += s.speed;

    s.speed = BASE_SPEED + s.score * 0.005;

    if (s.jumping) {
      s.vy += GRAVITY;
      s.y += s.vy;
      const currentGround = getGroundY(100);
      if (s.y >= currentGround) {
        s.y = currentGround;
        s.vy = 0;
        s.jumping = false;
      }
    } else {
      s.y = getGroundY(100);
      s.legPhase += 0.25;
    }

    s.spawnTimer++;
    const spawnInterval = Math.max(50, 100 - s.score * 0.3);
    if (s.spawnTimer > spawnInterval) {
      spawnObstacle();
      s.spawnTimer = 0;
    }

    for (const ob of s.obstacles) {
      ob.x -= s.speed;
      ob.y = getGroundY(ob.x) - ob.h;
    }

    s.obstacles = s.obstacles.filter((ob) => ob.x > -50);

    for (const ob of s.obstacles) {
      if (!ob.passed && ob.x + ob.w < 90) {
        ob.passed = true;
        s.score++;
      }
    }

    const playerBox = { x: 82, y: s.y - 36, w: 26, h: 36 };
    for (const ob of s.obstacles) {
      const obBox = { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
      if (
        playerBox.x < obBox.x + obBox.w &&
        playerBox.x + playerBox.w > obBox.x &&
        playerBox.y < obBox.y + obBox.h &&
        playerBox.y + playerBox.h > obBox.y
      ) {
        s.gameOver = true;
        s.running = false;
      }
    }

    // ── draw ──
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    ctx.strokeStyle = GROUND_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, getGroundY(0));
    for (let gx = 0; gx <= CANVAS_W; gx += 20) {
      ctx.lineTo(gx, getGroundY(gx));
    }
    ctx.stroke();

    ctx.fillStyle = "#111";
    for (let i = 0; i < 40; i++) {
      const dx = ((i * 67 + s.scrollX * 0.5) % (CANVAS_W + 40)) - 20;
      const dy = getGroundY(dx) + 4 + (i % 7) * 3;
      if (dy < CANVAS_H) {
        ctx.fillRect(dx, dy, 1, 1);
      }
    }
    ctx.restore();

    for (const ob of s.obstacles) {
      switch (ob.type) {
        case "vase":
          drawVase(ctx, ob.x, ob.y, ob.w, ob.h);
          break;
        case "flame":
          drawFlame(ctx, ob.x, ob.y, ob.w, ob.h, s.frame);
          break;
        case "rock":
          drawSmallRock(ctx, ob.x, ob.y, ob.w, ob.h);
          break;
        case "trident":
          drawTrident(ctx, ob.x, ob.y, ob.w, ob.h);
          break;
      }
    }

    const playerX = 100;
    drawStickman(ctx, playerX, s.y, s.legPhase);

    const rockCx = playerX + 14;
    const rockCy = s.y - 24;
    drawRock(ctx, rockCx, rockCy, 10);

    ctx.fillStyle = "#3a3a3a";
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(s.score).padStart(5, "0"), CANVAS_W - 16, 24);

    if (s.gameOver) {
      ctx.fillStyle = "rgba(8,8,8,0.6)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#6a6a6a";
      ctx.font = "12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("the boulder rolls back.", CANVAS_W / 2, CANVAS_H / 2 - 10);
      ctx.fillStyle = "#3a3a3a";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText("press space to push again", CANVAS_W / 2, CANVAS_H / 2 + 12);
    }

    if (s.running) {
      requestAnimationFrame(gameLoop);
    }
  }, [getGroundY, spawnObstacle, drawStickman, drawRock, drawVase, drawFlame, drawSmallRock, drawTrident]);

  const handleInput = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver) {
      reset();
      requestAnimationFrame(gameLoop);
      return;
    }
    if (!s.started) {
      s.started = true;
      s.running = true;
      requestAnimationFrame(gameLoop);
      return;
    }
    if (!s.jumping && s.running) {
      s.jumping = true;
      s.vy = JUMP_FORCE;
    }
  }, [reset, gameLoop]);

  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = GROUND_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, getGroundY(0));
    for (let gx = 0; gx <= CANVAS_W; gx += 20) {
      ctx.lineTo(gx, getGroundY(gx));
    }
    ctx.stroke();

    const gy = getGroundY(100);
    drawStickman(ctx, 100, gy, Math.PI / 2);
    drawRock(ctx, 114, gy - 24, 10);

    ctx.fillStyle = "#3a3a3a";
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("press space to begin the ascent", CANVAS_W / 2, CANVAS_H / 2 + 40);
  }, [getGroundY, drawStickman, drawRock]);

  useEffect(() => {
    drawIdle();

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleInput();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawIdle, handleInput]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="cursor-pointer"
        onClick={handleInput}
        style={{ imageRendering: "pixelated" }}
      />
      <span className="text-[10px] text-[var(--color-muted)] tracking-wide">
        one must imagine hermes happy
      </span>
    </div>
  );
}
