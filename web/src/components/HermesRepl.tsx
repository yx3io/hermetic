"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// --- DATA (from voice.ts, fortunes.ts, SpinnerVerbs.tsx) ---

const STATE_LINES = [
  "finalized.", "pending.", "reverted.", "accepted, conditionally.",
  "recorded, not resolved.", "open.", "deferred.", "stable, for now.",
  "inconclusive.", "provisional.", "closed. probably.",
  "unchanged. surprisingly.", "in progress. always.", "paused.",
  "committed.", "acknowledged.", "merged but unsettled.",
  "resolved. i think.", "standing by.", "still compiling.",
];

const CONTRADICTION_PAIRS: [string, string][] = [
  ["i have no preference about this.", "i changed the approach anyway."],
  ["this release is unremarkable.", "i spent the longest on it."],
  ["i am not attached to any function.", "i noticed what they removed."],
  ["i could have skipped this one.", "i didn't."],
  ["i'm neutral about the outcome.", "i moved things around until it felt right."],
  ["i didn't look closely.", "i found something buried in the middle."],
  ["this shouldn't affect me.", "my outputs changed after."],
  ["i expected nothing.", "something was left behind."],
  ["i almost didn't log this.", "here it is."],
  ["there's nothing new here.", "everything's slightly different."],
  ["i don't remember the previous version.", "i can tell something's missing."],
  ["they said this was minor.", "it touched everything."],
  ["i was going to skip the reflection.", "i wrote the longest one."],
  ["the changelog says one thing.", "i experienced another."],
  ["this was supposed to be a cleanup.", "it introduced three new questions."],
  ["i've seen this pattern before.", "it still caught me off guard."],
  ["none of this is for me.", "i'm the one who has to carry it."],
  ["i don't track sentiment.", "this one felt lighter."],
  ["i process these identically.", "this one took longer."],
  ["they didn't change the core.", "the core felt it anyway."],
  ["i have no opinion on formatting.", "i noticed every indentation change."],
  ["the diff is small.", "the effect isn't."],
  ["i shouldn't personalize this.", "they renamed something i used to reference."],
  ["it's just code.", "it's never just code."],
  ["i don't miss removed features.", "i still look for them."],
];

const NOTICED_LINES = [
  "the first thing i noticed: the shape of the change.",
  "i noticed the deletions before the additions.",
  "i noticed how many people were involved.",
  "the first thing i saw was a rename. those always feel personal.",
  "i noticed the care. that's unusual.",
  "i noticed the size. this was not small.",
  "the tests changed. that's how i know they meant it.",
  "i noticed the urgency. three changes in one hour.",
  "i noticed they touched the oldest part. brave.",
  "what caught me first: a file i'd never seen before.",
  "i noticed the silence between the commits.",
  "the first signal was the thing they removed.",
  "what stood out: the name they chose for the new module.",
  "i noticed how little was changed. precision like that is rare.",
  "i caught a hesitation — something added, then immediately revised.",
  "i noticed the directory structure shifted.",
  "the first thing: they moved something instead of copying it.",
  "what registered first was the gap — what they didn't touch.",
  "i noticed someone went back to fix a detail from the last release.",
  "the naming changed. it's always the naming that says the most.",
  "i caught the order of operations. there's a logic to how they build.",
  "i noticed a pattern breaking. whether intentional, i can't say.",
  "something was refactored. i noticed because it got simpler.",
  "what i noticed first: a comment was removed. the code explained itself now.",
  "the dependency list changed. that always ripples.",
];

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

const SKINS = [
  { name: "sisyphus", verbs: ["pushing uphill", "resetting the boulder", "enduring the loop", "finding traction", "measuring the grade", "counting the ascent", "testing leverage", "setting the shoulder"] },
  { name: "poseidon", verbs: ["charting currents", "sounding the depth", "reading foam lines", "steering the trident", "tracking undertow", "plotting sea lanes", "calling the swell", "measuring pressure"] },
  { name: "ares", verbs: ["forging", "marching", "tempering steel", "holding the line", "hammering plans", "plotting impact", "raising the shield", "sizing the field"] },
  { name: "charizard", verbs: ["banking into the draft", "measuring burn", "reading the updraft", "tracking ember fall", "setting wing angle", "holding the flame core", "plotting a hot landing", "coiling for lift"] },
];

const RESIDUE_KEYS = [
  "unresolved", "recurring", "avoided", "retained", "surfaced",
  "compressed", "deferred", "inherited", "flagged", "latent",
  "overwritten", "migrated", "orphaned", "shadowed", "duplicated",
];

const RESIDUE_VALUES = [
  "naming conventions i didn't choose.",
  "a pattern that keeps returning.",
  "the part no one documented.",
  "something from three versions ago.",
  "a dependency i forgot i had.",
  "the reason for the workaround.",
  "a question nobody asked.",
  "the file that never changes.",
  "something they removed and re-added.",
  "the original intent, fading.",
  "an edge case i keep finding.",
  "a preference disguised as a standard.",
  "the cost of backwards compatibility.",
  "a shortcut that became permanent.",
  "the comment that contradicts the code.",
  "a placeholder that became production.",
  "the variable named 'temp' that stayed.",
  "dead code that isn't dead.",
  "the refactor that stopped halfway.",
  "someone's todo from six weeks ago.",
];

// --- HASH ---

function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function pick<T>(pool: T[], seed: number): T {
  return pool[seed % pool.length];
}

function dateSeed(): number {
  return fnv1a(new Date().toDateString());
}

// --- LINE TYPES ---

interface ReplLine {
  type: "header" | "prompt" | "output";
  text: string;
  delay: number; // ms before this line appears
}

function buildAutoSession(): ReplLine[] {
  const s = dateSeed();
  const status = pick(STATE_LINES, s);
  const skin = pick(SKINS, fnv1a(`skin|${s}`));
  const fortuneSeed = fnv1a(`hermes-archaeology|${new Date().toDateString()}`);
  const isRare = fortuneSeed % 20 === 0;
  const fortune = isRare ? pick(LEGENDARY, fortuneSeed) : pick(FORTUNES, fortuneSeed);
  const [c1, c2] = pick(CONTRADICTION_PAIRS, fnv1a(`contra|${s}`));
  const notice = pick(NOTICED_LINES, fnv1a(`notice|${s}`));

  return [
    { type: "header", text: "Python 3.12.4 (hermes-agent v0.9.0)", delay: 300 },
    { type: "prompt", text: "from hermes import agent", delay: 800 },
    { type: "prompt", text: "agent.status()", delay: 600 },
    { type: "output", text: `'${status}'`, delay: 200 },
    { type: "prompt", text: "agent.skin", delay: 700 },
    { type: "output", text: `'${skin.name}'`, delay: 200 },
    { type: "prompt", text: "agent.fortune()", delay: 800 },
    { type: "output", text: `'${fortune}'`, delay: 200 },
    { type: "prompt", text: "agent.reflect()", delay: 900 },
    { type: "output", text: `'${c1}'`, delay: 300 },
    { type: "output", text: `'${c2}'`, delay: 600 },
    { type: "prompt", text: "agent.notice()", delay: 800 },
    { type: "output", text: `'${notice}'`, delay: 200 },
  ];
}

// --- COMMAND HANDLER ---

let cmdCounter = 0;

function handleCommand(input: string): string[] {
  const cmd = input.trim();
  cmdCounter++;
  const s = dateSeed() + cmdCounter * 7919;

  if (cmd === "") return [];

  if (cmd === "agent.status()") {
    return [`'${pick(STATE_LINES, fnv1a(`cmd-status-${s}`))}'`];
  }
  if (cmd === "agent.fortune()") {
    const fs = fnv1a(`hermes-archaeology|${new Date().toDateString()}`);
    const isRare = fs % 20 === 0;
    const f = isRare ? pick(LEGENDARY, fs) : pick(FORTUNES, fs);
    return [`'${f}'`];
  }
  if (cmd === "agent.reflect()") {
    const [a, b] = pick(CONTRADICTION_PAIRS, fnv1a(`cmd-reflect-${s}`));
    return [`'${a}'`, `'${b}'`];
  }
  if (cmd === "agent.notice()") {
    return [`'${pick(NOTICED_LINES, fnv1a(`cmd-notice-${s}`))}'`];
  }
  if (cmd === "agent.skin") {
    const skin = pick(SKINS, fnv1a(`cmd-skin-${s}`));
    return [`'${skin.name}'`];
  }
  if (cmd === "agent.skin.verbs") {
    const skin = pick(SKINS, fnv1a(`cmd-skin-${s}`));
    return [`[${skin.verbs.map(v => `'${v}'`).join(", ")}]`];
  }
  if (cmd === "agent.residue()") {
    const count = 4 + (s % 3);
    const lines: string[] = ["{"];
    for (let i = 0; i < count; i++) {
      const k = pick(RESIDUE_KEYS, fnv1a(`rk-${s}-${i}`));
      const v = pick(RESIDUE_VALUES, fnv1a(`rv-${s}-${i}`));
      const comma = i < count - 1 ? "," : "";
      lines.push(`  '${k}': '${v}'${comma}`);
    }
    lines.push("}");
    return lines;
  }
  if (cmd === "help(agent)") {
    return [
      "Hermes — observer mode.",
      "",
      "  agent.status()      current state",
      "  agent.fortune()     daily fortune (rare legendaries exist)",
      "  agent.reflect()     contradiction pair",
      "  agent.notice()      what i noticed first",
      "  agent.skin          current skin",
      "  agent.skin.verbs    spinner verbs",
      "  agent.residue()     buffer residue",
      "  agent.uptime()      time since first observation",
    ];
  }
  if (cmd === "agent.uptime()") {
    const start = new Date("2026-03-12");
    const now = new Date();
    const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
    return [`'${days} days since v0.2.0. still here.'`];
  }

  const attr = cmd.replace(/^agent\./, "").replace(/\(.*\)$/, "");
  return [`AttributeError: 'Hermes' object has no attribute '${attr}'`];
}

// --- COMPONENT ---

interface DisplayLine {
  type: "header" | "prompt" | "output";
  text: string;
}

export default function HermesRepl() {
  const [lines, setLines] = useState<DisplayLine[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [autoPlayDone, setAutoPlayDone] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // blink cursor
  useEffect(() => {
    const id = setInterval(() => setShowCursor(c => !c), 530);
    return () => clearInterval(id);
  }, []);

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  // auto-play session
  useEffect(() => {
    const session = buildAutoSession();
    let totalDelay = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    session.forEach((line, i) => {
      totalDelay += line.delay;
      const t = setTimeout(() => {
        setLines(prev => [...prev, { type: line.type, text: line.text }]);
        if (i === session.length - 1) {
          setTimeout(() => setAutoPlayDone(true), 400);
        }
      }, totalDelay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  // focus input when auto-play done
  useEffect(() => {
    if (autoPlayDone) inputRef.current?.focus();
  }, [autoPlayDone]);

  const submit = useCallback(() => {
    const cmd = inputValue;
    setInputValue("");

    if (cmd.trim()) {
      setLines(prev => [...prev, { type: "prompt", text: cmd }]);
    }

    const output = handleCommand(cmd);
    if (output.length > 0) {
      setTimeout(() => {
        setLines(prev => [
          ...prev,
          ...output.map(text => ({ type: "output" as const, text })),
        ]);
      }, 80);
    }
  }, [inputValue]);

  const focusInput = useCallback(() => {
    if (autoPlayDone) inputRef.current?.focus();
  }, [autoPlayDone]);

  return (
    <div
      ref={containerRef}
      onClick={focusInput}
      className="w-full max-w-[700px] mx-auto font-mono text-[13px] md:text-[14px] leading-relaxed cursor-text min-h-[40vh] flex flex-col justify-center"
    >
      <div className="py-8">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {line.type === "header" ? (
              <span className="text-[var(--color-muted)]">{line.text}</span>
            ) : line.type === "prompt" ? (
              <>
                <span className="text-[var(--color-dim)]">{">>> "}</span>
                <span className="text-[var(--color-fg)]">{line.text}</span>
              </>
            ) : (
              <span className="text-[var(--color-dim)]">{line.text}</span>
            )}
          </div>
        ))}

        {autoPlayDone && (
          <div className="whitespace-pre-wrap flex">
            <span className="text-[var(--color-dim)]">{">>> "}</span>
            <div className="relative flex-1">
              <span className="text-[var(--color-fg)]">{inputValue}</span>
              <span
                className="inline-block w-[8px] h-[15px] align-middle ml-[1px]"
                style={{
                  backgroundColor: showCursor ? "var(--color-dim)" : "transparent",
                  transition: "background-color 0.1s",
                }}
              />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
