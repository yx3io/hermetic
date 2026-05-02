"use client";

import { useState, useEffect } from "react";

const FORTUNES = [
  "you are one clean refactor away from clarity",
  "a tiny rename today prevents a huge bug tomorrow",
  "your next commit message will be immaculate",
  "the edge case you are ignoring is already solved in your head",
  "minimal diff, maximal calm",
  "today favors bold deletions over new abstractions",
  "the right helper is already in your codebase",
  "you will ship before overthinking catches up",
  "tests are about to save your future self",
  "your instincts are correctly suspicious of that one branch",
];

const LEGENDARY = [
  "legendary drop: one-line fix, first try",
  "legendary drop: every flaky test passes cleanly",
  "legendary drop: your diff teaches by itself",
];

function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function fortuneForDate(dateStr: string): { text: string; rare: boolean } {
  const n = fnv1a(`hermes-archaeology|${dateStr}`);
  const rare = n % 20 === 0;
  const bag = rare ? LEGENDARY : FORTUNES;
  return { text: bag[n % bag.length], rare };
}

export default function DailyFortune() {
  const [fortune, setFortune] = useState<{ text: string; rare: boolean } | null>(null);

  useEffect(() => {
    setFortune(fortuneForDate(new Date().toDateString()));
  }, []);

  if (!fortune) return null;

  return (
    <div className="animate-in-delay text-center">
      <span className="text-[12px] text-[var(--color-dim)] font-mono">
        {fortune.rare ? "✦ " : "· "}
        {fortune.text}
      </span>
    </div>
  );
}
