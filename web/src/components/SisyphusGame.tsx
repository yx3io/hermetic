"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const CANVAS_W = 800;
const CANVAS_H = 300;
const GROUND_Y = 260;
const SLOPE_ANGLE = 0.17;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const BASE_SPEED = 3.5;

const STICKMAN_COLOR = "#e8e8e8";
const GROUND_COLOR = "#2a2a2a";
const OB_COLOR = "#c0c0c0";
const BG = "#080808";

const SVG_FLAME_D = "m48.586 1.1094c2.2227 1.6172 4.3438 2.9297 6.2617 4.5469 6.4648 5.3555 10.605 12.121 11.617 20.605 0.60547 5.5547-0.10156 10.91-1.918 16.16-1.5156 4.2422 0.20312 8.5859 4.1406 10.305 2.8281 1.2109 5.5547 0.80859 7.9805-1.0117 2.4258-1.918 3.4336-4.5469 2.9297-7.6758 0-0.20312-0.10156-0.50391-0.10156-0.80859 0.20312 0.10156 0.30469 0.10156 0.30469 0.20312 4.3438 7.0703 7.1719 14.645 7.1719 23.133 0.10156 11.211-5.0508 19.797-13.84 26.465-2.5234 1.918-5.2539 3.332-8.2812 4.4453 4.3438-4.0391 6.3633-8.7891 5.4531-14.645-0.70703-4.6445-3.2305-8.2812-6.5664-11.312-0.30469 1.4141-0.40234 2.9297-1.0117 4.2422-1.918 3.9375-7.0703 4.7461-10.305 1.8164-4.8477-4.4453-6.3633-10.102-5.8594-16.465 0.50781-5.9609 5.9609-17.68 5.9609-18.082-1.0117 0.30469-30 21.312-16.566 48.688 1.2109 2.5234 3.0312 4.7461 5.1523 6.668-0.80859-0.30469-1.5156-0.50391-2.3242-0.80859-7.6758-2.9297-14.039-7.5742-18.281-14.746-3.5352-5.9609-4.3438-12.426-3.6367-19.191 1.3125-11.617 6.5664-21.211 14.645-29.496 5.4531-5.5547 10.203-11.617 13.84-18.484 1.6172-3.1328 2.9297-6.3633 3.2305-9.8984 0.10547-1.418 0.003907-2.832 0.003907-4.6523z";
const SVG_FLAME_VB = { x: -5, y: -10, w: 110, h: 135 };

const SVG_TRIDENT_D = "m64.555 20.801-3.5742-7.1523-3.5781 7.1523 1.9336 3.8672v3.4492c0 4.4297-3.1055 8.2539-7.4414 9.1602v-19.113l1.6641-3.3281-3.5781-7.1523-3.5742 7.1523 1.6641 3.3281v19.113c-4.3359-0.90625-7.4453-4.7305-7.4453-9.1602v-3.4492l1.9336-3.8672-3.5742-7.1523-3.5781 7.1523 1.9336 3.8672v3.4492c0.003906 6.2422 4.5586 11.551 10.73 12.496v49.789c0 1.0547 0.85547 1.9102 1.9102 1.9102 1.0586 0 1.9141-0.85547 1.9141-1.9102v-49.789c6.168-0.94531 10.727-6.2539 10.727-12.496v-3.4492z";
const SVG_TRIDENT_VB = { x: -5, y: -10, w: 110, h: 135 };

const SVG_VASE_D = "m37.5 21.801v14.25c-3.1758 1.875-11.523 7.1016-16.977 12.977-3.3242 3.5742-5.5234 7.4492-5.5234 10.977 0 18.523 13.227 31.773 13.227 31.773 0.47656 0.47656 1.1016 0.72656 1.7734 0.72656v1.0742c0 1.6992 0.67578 3.3516 1.875 4.5508 1.1992 1.1992 2.8516 1.875 4.5508 1.875h27.125c1.6992 0 3.3516-0.67578 4.5508-1.875 1.1992-1.1992 1.875-2.8516 1.875-4.5508v-1.0742c0.67578 0 1.3008-0.27344 1.7734-0.72656 0 0 13.227-13.25 13.227-31.773 0-3.5234-2.1992-7.3984-5.5234-10.977-5.4492-5.8516-13.801-11.074-16.977-12.977v-14.25c1.5-0.57422 3.6758-1.5742 5.5508-3.1016 2.4766-2 4.4492-4.8516 4.4492-8.6992 0-2.2734-1.1992-4.3008-3.5234-5.875-3.875-2.6484-11.398-4.125-18.977-4.125-7.5742 0-15.125 1.4492-18.977 4.125-2.3242 1.5742-3.5234 3.625-3.5234 5.875 0 3.8516 1.9766 6.6992 4.4492 8.6992 1.8984 1.5234 4.0508 2.5234 5.5508 3.1016zm27.5 70.699h-30v1.0742c0 0.375 0.14844 0.75 0.42578 1.0234 0.27344 0.27344 0.625 0.42578 1.0234 0.42578h27.125c0.375 0 0.75-0.14844 1.0234-0.42578 0.27344-0.27344 0.42578-0.625 0.42578-1.0234v-1.0742zm14.801-28.773c-6.0742 2.2266-18.602 6.2734-29.801 6.2734s-23.727-4.0508-29.801-6.2734c0.375 3.4258 1.1992 6.6016 2.2734 9.4766 1.625-1.6016 4.0742-3.1992 7.3008-3.1992 2.9258 0 4.9258 2.0234 6.4492 4.8242 0.72656 1.3516 1.375 2.8984 2.1992 4.1016 0.375 0.55078 0.72656 1.0742 1.375 1.0742 1.3242 0 2.1758-0.125 2.6016-0.64844 0.25-0.32422 0.125-0.75 0-1.125-0.44922-1.5-2.3242-2.1758-2.3242-2.1758-1.2734-0.52344-1.875-2-1.3516-3.2734 0.52344-1.2734 2-1.875 3.2734-1.3516 0 0 4.125 1.8242 5.1758 5.3242 0.60156 1.9766 0.375 4.0508-0.85156 5.6484-1.0742 1.375-3.0508 2.5742-6.5508 2.5742-2.9258 0-4.9258-2.0234-6.4492-4.8242-0.72656-1.3516-1.375-2.8984-2.1992-4.1016-0.375-0.55078-0.72656-1.0742-1.3516-1.0742-2.8242 0-4.4766 2.3008-5.0508 3.2266 2.4258 4.625 5.125 7.8984 6.3516 9.2734h37.824c1.2266-1.3516 3.8516-4.5508 6.25-9.0742-0.42578-0.75-2.125-3.4258-5.1484-3.4258-0.64844 0-1 0.55078-1.375 1.0742-0.82422 1.1992-1.4492 2.7266-2.1992 4.1016-1.5234 2.8008-3.5234 4.8242-6.4492 4.8242-3.4766 0-5.4766-1.1992-6.5508-2.5742-1.2266-1.6016-1.4492-3.6758-0.85156-5.6484 1.0508-3.5 5.1758-5.3242 5.1758-5.3242 1.2734-0.52344 2.75 0.074218 3.2734 1.3516 0.52344 1.2734-0.074219 2.75-1.3516 3.2734 0 0-1.875 0.67578-2.3242 2.1758-0.125 0.39844-0.22656 0.82422 0 1.125 0.39844 0.52344 1.2734 0.64844 2.6016 0.64844 0.64844 0 1-0.55078 1.375-1.0742 0.82422-1.1992 1.4492-2.7266 2.1992-4.1016 1.5234-2.8008 3.5234-4.8242 6.4492-4.8242 3.3516 0 5.8242 1.6992 7.4492 3.3516 1.1016-2.8984 1.9766-6.125 2.3516-9.625zm-55.574-11.352c-0.875 0.94922-1.6758 1.8984-2.3516 2.875-0.75 1.0742-1.3242 2.125-1.6484 3.1758 4.6992 1.8516 18.023 6.5742 29.75 6.5742 11.727 0 25.051-4.75 29.75-6.5742-0.32422-1.0508-0.89844-2.1016-1.6484-3.1758-0.67578-0.97656-1.4766-1.9258-2.3516-2.875-0.25 0.074219-0.5 0.125-0.77344 0.125-2.0234 0-2.8984 0.82422-3.6016 1.8242-0.47656 0.67578-0.92578 1.375-1.3984 2.0508-1.4766 1.9766-3.375 3.6484-7.4766 3.6484-2.6484 0-4.8242-1.4258-6.8516-3.3242-1.1016-1.0234-2.125-2.1992-3.25-3.1016-0.72656-0.57422-1.4766-1.0742-2.3984-1.0742-0.92578 0-1.6758 0.5-2.3984 1.0742-1.125 0.89844-2.1758 2.0742-3.25 3.1016-2 1.8984-4.1992 3.3242-6.8516 3.3242-4.1016 0-6-1.6758-7.4766-3.6484-0.5-0.64844-0.92578-1.375-1.3984-2.0508-0.69922-0.97656-1.6016-1.8242-3.6016-1.8242-0.27344 0-0.52344-0.050781-0.77344-0.125zm16.426-12.375c-1.6758 0.97656-6.9766 4.125-11.852 8.1484 1.6758 0.67578 2.75 1.7734 3.6758 3 0.5 0.64844 0.92578 1.375 1.3984 2.0508 0.69922 0.97656 1.6016 1.8242 3.6016 1.8242 0.92578 0 1.6758-0.5 2.3984-1.0742 1.125-0.89844 2.1758-2.0742 3.25-3.1016 2-1.8984 4.1992-3.3242 6.8516-3.3242 2.6484 0 4.8242 1.4258 6.8516 3.3242 1.1016 1.0234 2.125 2.1992 3.25 3.1016 0.72656 0.57422 1.4766 1.0742 2.3984 1.0742 2.0234 0 2.8984-0.82422 3.6016-1.8242 0.47656-0.67578 0.92578-1.375 1.3984-2.0508 0.92578-1.2266 2-2.3242 3.6758-3-4.875-4-10.148-7.1758-11.852-8.1484h-18.676zm21.852 7.5c1.375 0 2.5 1.125 2.5 2.5s-1.125 2.5-2.5 2.5-2.5-1.125-2.5-2.5 1.125-2.5 2.5-2.5zm-25 0c1.375 0 2.5 1.125 2.5 2.5s-1.125 2.5-2.5 2.5-2.5-1.125-2.5-2.5 1.125-2.5 2.5-2.5zm20-20v-7.5c0-1.1484 0.77344-2.1484 1.8984-2.4258 0 0 3.0508-0.77344 5.5-2.75 1.375-1.125 2.6016-2.6758 2.6016-4.8242 0-0.52344-0.32422-0.92578-0.75-1.3008-0.52344-0.44922-1.1758-0.85156-1.9492-1.2266-3.5742-1.6758-9.1758-2.4766-14.773-2.4766-5.6016 0-11.199 0.77344-14.773 2.4766-0.77344 0.375-1.4492 0.77344-1.9492 1.2266-0.42578 0.39844-0.75 0.80078-0.75 1.3008 0 2.1484 1.2266 3.6992 2.6016 4.8242 2.4492 2 5.5 2.75 5.5 2.75 1.125 0.27344 1.8984 1.2734 1.8984 2.4258v7.5c1.375 0 2.5 1.125 2.5 2.5s-1.125 2.5-2.5 2.5v2.5h15v-2.5c-1.375 0-2.5-1.125-2.5-2.5s1.125-2.5 2.5-2.5zm-7.5 0c1.375 0 2.5 1.125 2.5 2.5s-1.125 2.5-2.5 2.5-2.5-1.125-2.5-2.5 1.125-2.5 2.5-2.5zm-11.051-12.727c7.0742 3.2266 14.398 3.4492 22.074 0 1.25-0.57422 1.8242-2.0508 1.25-3.3008-0.57422-1.25-2.0508-1.8242-3.3008-1.25-6.2266 2.8008-12.199 2.6484-17.926 0-1.25-0.57422-2.75 0-3.3242 1.2266-0.57422 1.25 0 2.75 1.2266 3.3242z";

const SVG_THETA_D = "M274 646c-129,-1 -270,-64 -274,-324 -4,-229 138,-320 275,-322 138,-2 284,96 287,318 3,157 -68,330 -288,328zm177 -326c-8,-198 -100,-295 -175,-295 -148,-1 -172,206 -168,295 10,207 94,293 167,291 141,-5 180,-201 176,-291z M218 285c-23,-5 -35,-25 -56,-42l0 159c21,-17 33,-36 56,-42 33,-6 93,-6 126,0 25,5 35,25 56,42l0 -159c-21,17 -31,37 -56,42 -33,6 -92,6 -126,0z";
const SVG_THETA_VB = { x: 0, y: 0, w: 562, h: 650 };

const SVG_CRAB_D = "M95.7,55.7l-10.9-4.8c-0.5-0.2-1.2-0.3-1.7-0.2l-8.5,1.5c-0.6-0.9-1.3-1.7-2.1-2.5l6.2-7.8c1-1.3,1.1-3.2,0.1-4.5l-6.4-9.2c1.5-3.2,1.2-7.2-1.2-10.3c-2.1-2.8-5.3-4.2-8.4-4c-0.8,0-1.4,0.9-1.1,1.7l2.4,6.9c0.3,0.8-0.6,1.5-1.3,1l-6.1-4.1c-0.7-0.5-1.7-0.2-1.9,0.6c-0.9,2.9-0.4,6.4,1.7,9.2c2.5,3.2,6.5,4.6,10,3.8l4.5,6.5l-4.7,5.9c-1.8-0.9-3.7-1.7-5.8-2.3c0.1-0.3,0.1-0.5,0.1-0.8c0-2.1-1.7-3.8-3.8-3.8c-1.9,0-3.5,1.4-3.7,3.3c-1-0.1-2.1-0.1-3.1-0.1s-2.1,0.1-3.1,0.1c-0.2-1.8-1.8-3.3-3.7-3.3c-2.1,0-3.8,1.7-3.8,3.8c0,0.3,0,0.6,0.1,0.8c-2.1,0.6-4,1.4-5.8,2.3l-4.7-5.9l4.5-6.5c3.5,0.8,7.5-0.6,10-3.8c2.1-2.8,2.6-6.2,1.7-9.2c-0.3-0.8-1.2-1.1-1.9-0.6l-6.1,4.1c-0.7,0.5-1.6-0.2-1.3-1l2.4-6.9c0.3-0.8-0.3-1.7-1.1-1.7c-3.1-0.1-6.3,1.3-8.4,4c-2.4,3.1-2.7,7.2-1.2,10.3l-6.4,9.2c-1,1.4-0.9,3.2,0.1,4.5l6.2,7.8c-0.8,0.8-1.5,1.7-2.1,2.5L17,50.7c-0.6-0.1-1.2,0-1.7,0.2L4.3,55.7c-1.6,0.7-2.3,2.5-1.6,4c0.5,1.2,1.6,1.8,2.8,1.8c0.4,0,0.8-0.1,1.2-0.3l10.1-4.4l6.2,1.1C23,58.7,23,59.3,23,60c0,0.2,0,0.4,0,0.6l-6.6,0.9c-0.7,0.1-1.3,0.4-1.7,0.9l-8.2,8.2c-1.2,1.2-1.2,3.1,0,4.3c0.6,0.6,1.4,0.9,2.2,0.9c0.8,0,1.6-0.3,2.2-0.9l7.5-7.5l6.4-0.9c0.5,0.8,1,1.7,1.6,2.4l-4.7,2.8c-0.5,0.3-0.8,0.7-1.1,1.1l-4.8,8.8c-0.8,1.5-0.3,3.3,1.2,4.2c0.5,0.3,1,0.4,1.5,0.4c1.1,0,2.1-0.6,2.7-1.6l4.4-8l5.6-3.4c4.9,3.3,11.6,5.3,18.9,5.3s14.1-2,18.9-5.3l5.6,3.4l4.4,8c0.6,1,1.6,1.6,2.7,1.6c0.5,0,1-0.1,1.5-0.4c1.5-0.8,2-2.7,1.2-4.2L79.5,73c-0.3-0.5-0.6-0.9-1.1-1.1L73.7,69c0.6-0.8,1.1-1.6,1.6-2.4l6.4,0.9l7.5,7.5c0.6,0.6,1.4,0.9,2.2,0.9c0.8,0,1.6-0.3,2.2-0.9c1.2-1.2,1.2-3.1,0-4.3l-8.2-8.2c-0.5-0.5-1.1-0.8-1.7-0.9L77,60.6c0-0.2,0-0.4,0-0.6c0-0.7-0.1-1.4-0.2-2l6.2-1.1l10.1,4.4c0.4,0.2,0.8,0.3,1.2,0.3c1.2,0,2.3-0.7,2.8-1.8C97.9,58.2,97.2,56.4,95.7,55.7z";
const SVG_CRAB_VB = { x: 0, y: 0, w: 100, h: 100 };

type ObstacleType = "vase" | "flame" | "theta" | "crab" | "trident";

type Obstacle = {
  x: number;
  type: ObstacleType;
  y: number;
  w: number;
  h: number;
  passed: boolean;
};

/** Scale per-frame constants to wall-clock (~60fps baseline). Stops 120Hz+ displays from running 2x fast. */
const TARGET_HZ = 60;
const MAX_STEP_SEC = 1 / 20;

export default function SisyphusGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const [showPrompt, setShowPrompt] = useState(true);
  const stateRef = useRef({
    running: false,
    gameOver: false,
    started: false,
    y: GROUND_Y,
    vy: 0,
    jumping: false,
    obstacles: [] as Obstacle[],
    spawnTimer: 0,
    nextSpawn: 80,
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
    const baseX = CANVAS_W + 40 + Math.floor(Math.random() * 120);

    if (roll < 0.22) {
      ob = { x: baseX, type: "vase", y: 0, w: 18, h: 26, passed: false };
      ob.y = getGroundY(ob.x) - ob.h;
    } else if (roll < 0.42) {
      ob = { x: baseX, type: "flame", y: 0, w: 26, h: 34, passed: false };
      ob.y = getGroundY(ob.x) - ob.h;
    } else if (roll < 0.58) {
      ob = { x: baseX, type: "theta", y: 0, w: 16, h: 22, passed: false };
      ob.y = getGroundY(ob.x) - ob.h;
    } else if (roll < 0.78) {
      ob = { x: baseX, type: "crab", y: 0, w: 30, h: 28, passed: false };
      ob.y = getGroundY(ob.x) - ob.h;
    } else {
      ob = { x: baseX, type: "trident", y: 0, w: 56, h: 56, passed: false };
      ob.y = getGroundY(ob.x) - 120;
    }

    s.obstacles.push(ob);

    const baseInterval = Math.max(30, 70 - s.frame * 0.05);
    s.nextSpawn = baseInterval + Math.floor(Math.random() * 90);
  }, [getGroundY]);

  const drawStickman = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, phase: number) => {
      const gY = y;
      ctx.save();
      ctx.strokeStyle = STICKMAN_COLOR;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const headX = x - 3;
      const headY = gY - 36;
      const shoulderX = x - 1;
      const shoulderY = gY - 28;
      const hipX = x - 12;
      const hipY = gY - 12;

      ctx.beginPath();
      ctx.arc(headX, headY, 4, 0, Math.PI * 2);
      ctx.fillStyle = STICKMAN_COLOR;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(hipX, hipY);
      ctx.stroke();

      const elbowX = x + 6;
      const elbowY = gY - 22;
      const handX = x + 13;
      const handY = gY - 15;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(elbowX, elbowY + 4);
      ctx.lineTo(handX, handY + 2);
      ctx.stroke();

      const legSwing = Math.sin(phase) * 4;
      const knee1X = hipX + 2 + legSwing;
      const knee1Y = gY - 4;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(knee1X, knee1Y);
      ctx.lineTo(hipX - 4 + legSwing * 1.2, gY);
      ctx.stroke();

      const knee2X = hipX + 2 - legSwing;
      const knee2Y = gY - 4;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(knee2X, knee2Y);
      ctx.lineTo(hipX - 4 - legSwing * 1.2, gY);
      ctx.stroke();

      ctx.restore();
    },
    []
  );

  const drawRock = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
      ctx.save();
      ctx.fillStyle = "#5a5a5a";

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

  const drawSvgPath = useCallback(
    (ctx: CanvasRenderingContext2D, d: string, vb: {x:number,y:number,w:number,h:number},
     x: number, y: number, w: number, h: number) => {
      ctx.save();
      const sx = w / vb.w;
      const sy = h / vb.h;
      ctx.translate(x - vb.x * sx, y - vb.y * sy);
      ctx.scale(sx, sy);
      const p = new Path2D(d);
      ctx.fillStyle = OB_COLOR;
      ctx.fill(p);
      ctx.restore();
    },
    []
  );

  const drawVase = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      drawSvgPath(ctx, SVG_VASE_D, { x: 10, y: 0, w: 80, h: 100 }, x, y, w, h);
    },
    [drawSvgPath]
  );

  const drawFlame = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      drawSvgPath(ctx, SVG_FLAME_D, SVG_FLAME_VB, x, y, w, h);
    },
    [drawSvgPath]
  );

  const drawTheta = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      drawSvgPath(ctx, SVG_THETA_D, SVG_THETA_VB, x, y, w, h);
    },
    [drawSvgPath]
  );

  const drawCrab = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      drawSvgPath(ctx, SVG_CRAB_D, SVG_CRAB_VB, x, y, w, h);
    },
    [drawSvgPath]
  );

  const drawTrident = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      ctx.save();
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.translate(cx, cy);
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-cx, -cy);
      drawSvgPath(ctx, SVG_TRIDENT_D, SVG_TRIDENT_VB, x, y, w, h);
      ctx.restore();
    },
    [drawSvgPath]
  );

  const reset = useCallback(() => {
    lastFrameTimeRef.current = null;
    const s = stateRef.current;
    s.y = GROUND_Y;
    s.vy = 0;
    s.jumping = false;
    s.obstacles = [];
    s.spawnTimer = 0;
    s.nextSpawn = 60 + Math.floor(Math.random() * 40);
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

    const now = performance.now();
    const last = lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    const dtSec =
      last === null
        ? 1 / TARGET_HZ
        : Math.min((now - last) / 1000, MAX_STEP_SEC);
    const scale = dtSec * TARGET_HZ;

    s.frame += scale;
    s.score += scale;
    s.scrollX += s.speed * scale;

    s.speed = BASE_SPEED + s.frame * 0.002;

    if (s.jumping) {
      s.vy += GRAVITY * scale;
      s.y += s.vy * scale;
      const currentGround = getGroundY(100);
      if (s.y >= currentGround) {
        s.y = currentGround;
        s.vy = 0;
        s.jumping = false;
      }
    } else {
      s.y = getGroundY(100);
      s.legPhase += 0.25 * scale;
    }

    s.spawnTimer += scale;
    if (s.spawnTimer > s.nextSpawn) {
      spawnObstacle();
      s.spawnTimer = 0;
    }

    for (const ob of s.obstacles) {
      ob.x -= s.speed * scale;
      if (ob.type === "trident") {
        ob.y = getGroundY(ob.x) - 120 + Math.sin(s.frame * 0.05) * 5;
      } else {
        ob.y = getGroundY(ob.x) - ob.h;
      }
    }

    s.obstacles = s.obstacles.filter((ob) => ob.x > -50);

    const playerBox = { x: 82, y: s.y - 36, w: 36, h: 36 };
    for (const ob of s.obstacles) {
      const obBox = ob.type === "trident"
        ? { x: ob.x + 6, y: ob.y + 10, w: ob.w - 12, h: ob.h - 20 }
        : { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
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
          drawFlame(ctx, ob.x, ob.y, ob.w, ob.h);
          break;
        case "theta":
          drawTheta(ctx, ob.x, ob.y, ob.w, ob.h);
          break;
        case "crab":
          drawCrab(ctx, ob.x, ob.y, ob.w, ob.h);
          break;
        case "trident":
          drawTrident(ctx, ob.x, ob.y, ob.w, ob.h);
          break;
      }
    }

    const playerX = 100;
    drawStickman(ctx, playerX, s.y, s.legPhase);

    const rockCx = playerX + 17;
    const rockCy = s.y - 13;
    drawRock(ctx, rockCx, rockCy, 13);

    ctx.fillStyle = "#3a3a3a";
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.floor(s.score)).padStart(5, "0"), CANVAS_W - 16, 24);

    if (s.gameOver) {
      ctx.fillStyle = "rgba(8,8,8,0.6)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#6a6a6a";
      ctx.font = "12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("the boulder rolls back.", CANVAS_W / 2, CANVAS_H / 2 - 10);
      ctx.fillStyle = "#3a3a3a";
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText("[space]", CANVAS_W / 2, CANVAS_H / 2 + 12);
    }

    if (s.running) {
      requestAnimationFrame(gameLoop);
    }
  }, [getGroundY, spawnObstacle, drawStickman, drawRock, drawVase, drawFlame, drawTheta, drawCrab, drawTrident]);

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
      setShowPrompt(false);
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
    drawRock(ctx, 117, gy - 13, 13);
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
      <div className="flex flex-col items-center gap-1">
        <span className={`text-[10px] tracking-wide ${showPrompt ? "text-white" : "invisible"}`}>
          [space]
        </span>
        <span className="text-[10px] text-[var(--color-muted)] tracking-wide">
          one must imagine hermes happy
        </span>
      </div>
    </div>
  );
}
