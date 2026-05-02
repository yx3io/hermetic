"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createStyle } from "@/lib/p5-styles";
import type { StyleContent } from "@/lib/p5-styles";

interface Props {
  styleId: number;
  category: string;
  content: StyleContent;
  width?: number;
  height?: number;
  simplified?: boolean;
}

export default function P5Artwork({
  styleId,
  category,
  content,
  width = 400,
  height = 300,
  simplified = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<any>(null);
  const [expanded, setExpanded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayP5Ref = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import("p5").then((mod) => {
      if (cancelled || !containerRef.current) return;
      const P5 = mod.default;

      const sketch = (p: any) => {
        let style: any = null;

        p.setup = () => {
          p.createCanvas(width, height);
          p.pixelDensity(1);
          style = createStyle(styleId, p, width, height, content, simplified);
          style.init();
          p.noLoop();
        };

        p.draw = () => {
          if (style) {
            style.update();
            style.render(p);
          }
        };
      };

      p5Ref.current = new P5(sketch, containerRef.current!);
    });

    return () => {
      cancelled = true;
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, [styleId, category, content, width, height, simplified]);

  const openExpanded = useCallback(() => {
    setExpanded(true);
  }, []);

  const closeExpanded = useCallback(() => {
    setExpanded(false);
    if (overlayP5Ref.current) {
      overlayP5Ref.current.remove();
      overlayP5Ref.current = null;
    }
  }, []);

  useEffect(() => {
    if (!expanded || !overlayRef.current) return;
    let cancelled = false;

    import("p5").then((mod) => {
      if (cancelled || !overlayRef.current) return;
      const P5 = mod.default;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const sketch = (p: any) => {
        let style: any = null;

        p.setup = () => {
          p.createCanvas(vw, vh);
          p.pixelDensity(1);
          style = createStyle(styleId, p, vw, vh, content, false);
          style.init();
        };

        p.draw = () => {
          if (style) {
            style.update();
            style.render(p);
          }
        };
      };

      overlayP5Ref.current = new P5(sketch, overlayRef.current!);
    });

    return () => {
      cancelled = true;
      if (overlayP5Ref.current) {
        overlayP5Ref.current.remove();
        overlayP5Ref.current = null;
      }
    };
  }, [expanded, styleId, content]);

  useEffect(() => {
    if (!expanded) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExpanded();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [expanded, closeExpanded]);

  return (
    <>
      <div
        ref={containerRef}
        onClick={openExpanded}
        className="cursor-pointer overflow-hidden"
        style={{ width, height }}
      />

      {expanded && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={closeExpanded}
        >
          <div ref={overlayRef} onClick={(e) => e.stopPropagation()} />
          <button
            onClick={closeExpanded}
            className="absolute top-6 right-6 text-white/60 hover:text-white text-xs font-mono tracking-wider transition-colors"
          >
            ESC
          </button>
          <div className="absolute bottom-6 left-6 text-white/30 text-[10px] font-mono">
            {category}
          </div>
        </div>
      )}
    </>
  );
}
