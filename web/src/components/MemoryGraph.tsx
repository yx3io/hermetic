"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface GraphNode {
  id: string;
  type: "hermes" | "contributor" | "memory" | "release";
  label: string;
  firstDay: number;
  detail?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  firstDay: number;
}

interface DayMeta {
  date: string;
  commits: number;
  isRelease: boolean;
  title: string;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  type: GraphNode["type"];
  label: string;
  firstDay: number;
  detail?: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  firstDay: number;
}

interface Props {
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    dayMeta: DayMeta[];
    totalDays: number;
  };
}

const NODE_R: Record<string, number> = {
  hermes: 8,
  release: 3,
  contributor: 1.5,
  memory: 2,
};

const NODE_CLR: Record<string, string> = {
  hermes: "#e8dcc8",
  contributor: "#6b6560",
  memory: "#a89070",
  release: "#c4a87a",
};

export default function MemoryGraph({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentDay, setCurrentDay] = useState(data.totalDays - 1);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const transformRef = useRef(d3.zoomIdentity);
  const dayRef = useRef(currentDay);
  const rafRef = useRef<number>(0);

  dayRef.current = currentDay;

  // Play/pause
  useEffect(() => {
    if (!isPlaying) return;
    let frame: number;
    let lastTime = 0;
    const step = (time: number) => {
      if (time - lastTime > 250) {
        lastTime = time;
        setCurrentDay((prev) => {
          if (prev >= data.totalDays - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, data.totalDays]);

  // Build simulation ONCE
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = Math.min(560, window.innerHeight * 0.55);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const simNodes: SimNode[] = data.nodes.map((n) => ({
      ...n,
      x: n.type === "hermes" ? width / 2 : width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: n.type === "hermes" ? height / 2 : height / 2 + (Math.random() - 0.5) * height * 0.6,
    }));

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = data.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        firstDay: e.firstDay,
      }));

    nodesRef.current = simNodes;
    linksRef.current = simLinks;

    const sim = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => {
            const s = d.source as SimNode;
            const t = d.target as SimNode;
            if (s.type === "hermes" || t.type === "hermes") {
              const other = s.type === "hermes" ? t : s;
              if (other.type === "release") return 50;
              if (other.type === "memory") return 70;
              return 100 + Math.random() * 60;
            }
            return 40;
          })
          .strength(0.2)
      )
      .force("charge", d3.forceManyBody().strength(-8).distanceMax(250))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.03))
      .force("collision", d3.forceCollide<SimNode>().radius((d) => NODE_R[d.type] + 0.5))
      .alphaDecay(0.015);

    simRef.current = sim;

    // Initial centering
    transformRef.current = d3.zoomIdentity;

    // Zoom via d3 on canvas
    const zoomBehavior = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
      });

    d3.select(canvas).call(zoomBehavior as any);

    // Click detection
    canvas.addEventListener("click", (event) => {
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const t = transformRef.current;
      const x = (mx - t.x) / t.k;
      const y = (my - t.y) / t.k;

      const day = dayRef.current;
      let found: SimNode | null = null;
      for (const n of nodesRef.current) {
        if (n.firstDay > day) continue;
        const dx = (n.x ?? 0) - x;
        const dy = (n.y ?? 0) - y;
        const r = Math.max(NODE_R[n.type] * 2, 6);
        if (dx * dx + dy * dy < r * r) {
          found = n;
          break;
        }
      }
      setSelectedNode(found);
    });

    // Render loop
    function draw() {
      const day = dayRef.current;
      const t = transformRef.current;
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

      // Edges
      ctx.strokeStyle = "rgba(100, 90, 80, 0.1)";
      ctx.lineWidth = 0.3;
      for (const l of linksRef.current) {
        if (l.firstDay > day) continue;
        const s = l.source as SimNode;
        const tgt = l.target as SimNode;
        if (s.firstDay > day || tgt.firstDay > day) continue;
        ctx.beginPath();
        ctx.moveTo(s.x ?? 0, s.y ?? 0);
        ctx.lineTo(tgt.x ?? 0, tgt.y ?? 0);
        ctx.stroke();
      }

      // Nodes
      for (const n of nodesRef.current) {
        if (n.firstDay > day) continue;
        const r = NODE_R[n.type];
        const age = day - n.firstDay;
        const alpha = n.type === "hermes" ? 1 : Math.min(0.85, 0.25 + age * 0.04);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = NODE_CLR[n.type];
        ctx.beginPath();
        ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hermes label
      const hermes = nodesRef.current.find((n) => n.type === "hermes");
      if (hermes) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#e8dcc8";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("hermes", hermes.x ?? 0, (hermes.y ?? 0) + NODE_R.hermes + 12);
      }

      ctx.globalAlpha = 1;
      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      sim.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, [data]);

  const dayInfo = data.dayMeta[currentDay];
  const contributorCount = data.nodes.filter(
    (n) => n.type === "contributor" && n.firstDay <= currentDay
  ).length;
  const memoryCount = data.nodes.filter(
    (n) => n.type === "memory" && n.firstDay <= currentDay
  ).length;
  const releaseCount = data.nodes.filter(
    (n) => n.type === "release" && n.firstDay <= currentDay
  ).length;

  return (
    <div>
      <div
        ref={containerRef}
        className="relative bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden"
        style={{ minHeight: "400px" }}
      >
        <canvas ref={canvasRef} className="w-full" />

        <div className="absolute top-3 left-3 font-mono text-[9px] text-[var(--color-muted)] space-y-1 pointer-events-none">
          <div>{contributorCount} contributors</div>
          <div>{memoryCount} memories</div>
          <div>{releaseCount} releases</div>
        </div>

        {selectedNode && (
          <div className="absolute top-3 right-3 max-w-[240px] bg-[var(--color-bg)] border border-[var(--color-border)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] tracking-[0.15em] uppercase text-[var(--color-muted)]">
                {selectedNode.type}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[var(--color-muted)] hover:text-[var(--color-fg)] text-xs"
              >
                x
              </button>
            </div>
            <div className="font-mono text-[11px] text-[var(--color-dim)] mb-1">
              {selectedNode.label}
            </div>
            {selectedNode.detail && (
              <div className="font-mono text-[9px] text-[var(--color-muted)] leading-relaxed mt-2">
                {selectedNode.detail}
              </div>
            )}
            <div className="font-mono text-[9px] text-[var(--color-muted)] mt-2 opacity-60">
              appeared day {selectedNode.firstDay + 1}
            </div>
          </div>
        )}
      </div>

      {/* Timeline scrubber */}
      <div className="mt-4 px-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
              } else {
                setCurrentDay(0);
                setIsPlaying(true);
              }
            }}
            className="text-[10px] font-mono text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors shrink-0 w-8"
          >
            {isPlaying ? "||" : ">>"}
          </button>

          <input
            type="range"
            min={0}
            max={data.totalDays - 1}
            value={currentDay}
            onChange={(e) => {
              setCurrentDay(parseInt(e.target.value));
              setIsPlaying(false);
            }}
            className="flex-1 cursor-pointer"
            style={{
              height: "4px",
              WebkitAppearance: "none",
              appearance: "none" as const,
              background: `linear-gradient(to right, var(--color-accent) ${
                (currentDay / (data.totalDays - 1)) * 100
              }%, var(--color-border) ${
                (currentDay / (data.totalDays - 1)) * 100
              }%)`,
              borderRadius: "2px",
              outline: "none",
            }}
          />
        </div>

        <div className="flex justify-between mt-2">
          <span className="font-mono text-[9px] text-[var(--color-muted)]">
            day {currentDay + 1} &middot; {dayInfo?.date}
            {dayInfo?.title ? ` · ${dayInfo.title}` : ""}
          </span>
          <span className="font-mono text-[9px] text-[var(--color-muted)]">
            {dayInfo?.commits || 0} commits
            {dayInfo?.isRelease ? " · release" : ""}
          </span>
        </div>
      </div>

      <div className="flex gap-5 mt-4 font-mono text-[9px] text-[var(--color-muted)]">
        {[
          { color: NODE_CLR.hermes, label: "hermes" },
          { color: NODE_CLR.contributor, label: "contributor" },
          { color: NODE_CLR.memory, label: "memory" },
          { color: NODE_CLR.release, label: "release" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
