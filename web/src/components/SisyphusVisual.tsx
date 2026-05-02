"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function SisyphusVisual() {
  const [progress, setProgress] = useState(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);

  const animate = useCallback(() => {
    setProgress((prev) => {
      if (activeRef.current) {
        const diff = targetRef.current - prev;
        return prev + diff * 0.08;
      }
      // gravity — always slides back
      if (prev < 0.005) return 0;
      return prev * 0.97;
    });
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      activeRef.current = true;
      const y = 1 - e.clientY / window.innerHeight;
      targetRef.current = Math.max(0, Math.min(1, y));
    };

    const onLeave = () => {
      activeRef.current = false;
    };

    const onTouch = (e: TouchEvent) => {
      activeRef.current = true;
      const y = 1 - e.touches[0].clientY / window.innerHeight;
      targetRef.current = Math.max(0, Math.min(1, y));
    };

    const onTouchEnd = () => {
      activeRef.current = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const bx = 50 + progress * 160;
  const by = 125 - progress * 95;

  return (
    <div className="w-[240px] h-[140px] md:w-[300px] md:h-[170px] relative select-none">
      <svg viewBox="0 0 260 150" fill="none" className="w-full h-full">
        {/* The slope */}
        <line
          x1="40" y1="130" x2="225" y2="25"
          stroke="var(--color-border)"
          strokeWidth="1"
        />
        {/* The boulder */}
        <circle
          cx={bx}
          cy={by}
          r="11"
          fill="none"
          stroke="var(--color-dim)"
          strokeWidth="1.5"
          style={{
            filter: progress > 0.85
              ? "drop-shadow(0 0 6px rgba(255,255,255,0.15))"
              : "none",
            transition: "filter 0.3s",
          }}
        />
        {/* Inner dot */}
        <circle
          cx={bx}
          cy={by}
          r="2"
          fill="var(--color-muted)"
        />
      </svg>
    </div>
  );
}
