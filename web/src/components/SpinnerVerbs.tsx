"use client";

import { useState, useEffect, useCallback } from "react";

const SKINS: { name: string; verbs: string[] }[] = [
  {
    name: "sisyphus",
    verbs: [
      "pushing uphill",
      "resetting the boulder",
      "enduring the loop",
      "finding traction",
      "measuring the grade",
      "counting the ascent",
      "testing leverage",
      "setting the shoulder",
    ],
  },
  {
    name: "poseidon",
    verbs: [
      "charting currents",
      "sounding the depth",
      "reading foam lines",
      "steering the trident",
      "tracking undertow",
      "plotting sea lanes",
      "calling the swell",
      "measuring pressure",
    ],
  },
  {
    name: "ares",
    verbs: [
      "forging",
      "marching",
      "tempering steel",
      "holding the line",
      "hammering plans",
      "plotting impact",
      "raising the shield",
      "sizing the field",
    ],
  },
  {
    name: "charizard",
    verbs: [
      "banking into the draft",
      "measuring burn",
      "reading the updraft",
      "tracking ember fall",
      "setting wing angle",
      "holding the flame core",
      "plotting a hot landing",
      "coiling for lift",
    ],
  },
];

const ALL_VERBS = SKINS.flatMap((s) =>
  s.verbs.map((v) => ({ verb: v, skin: s.name }))
);

function seededIndex(tick: number): number {
  let h = tick * 2654435761;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return Math.abs(h) % ALL_VERBS.length;
}

export default function SpinnerVerbs() {
  const [tick, setTick] = useState(0);
  const [visible, setVisible] = useState(true);

  const cycle = useCallback(() => {
    setVisible(false);
    const id = setTimeout(() => {
      setTick((t) => t + 1);
      setVisible(true);
    }, 600);
    return id;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      cycle();
    }, 3400);
    return () => clearInterval(interval);
  }, [cycle]);

  const { verb, skin } = ALL_VERBS[seededIndex(tick)];

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="transition-all duration-500 ease-in-out"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(4px)" }}
      >
        <span className="text-[24px] sm:text-[30px] md:text-[36px] font-light tracking-wide text-[var(--color-fg)]">
          {verb}
        </span>
        <span className="text-[var(--color-muted)] text-[24px] sm:text-[30px] md:text-[36px] font-light animate-pulse">
          ...
        </span>
      </div>
      <div
        className="transition-opacity duration-500"
        style={{ opacity: visible ? 0.4 : 0 }}
      >
        <span className="text-[10px] tracking-[0.4em] uppercase text-[var(--color-muted)]">
          {skin}
        </span>
      </div>
    </div>
  );
}
