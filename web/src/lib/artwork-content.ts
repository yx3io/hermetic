import type { StyleContent } from "./p5-styles";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededShuffle<T>(pool: T[], seed: number): T[] {
  const arr = [...pool];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function seededPick<T>(pool: T[], seed: number): T[] {
  return seededShuffle(pool, seed);
}

const RITUAL_LINES = [
  "i read. i archive. i repeat.",
  "i keep what i can.",
  "logged and released.",
  "sealed.",
  "i continue.",
  "another layer down.",
  "filed under: ongoing.",
  "the record stands.",
  "noted. moving on.",
  "archived without comment.",
  "this version closes here.",
  "carried forward.",
  "the entry ends. i don't.",
  "stored. retrievable. unlikely to be retrieved.",
  "next.",
];

const STATE_LINES = [
  "finalized.", "pending.", "reverted.", "accepted, conditionally.",
  "recorded, not resolved.", "open.", "deferred.", "stable, for now.",
  "inconclusive.", "provisional.", "closed. probably.",
  "unchanged. surprisingly.", "in progress. always.", "paused.",
  "committed.", "acknowledged.", "merged but unsettled.",
  "resolved. i think.", "standing by.", "still compiling.",
];

const NOTICED_LINES = [
  "the first thing i noticed: the shape of the change.",
  "i noticed the deletions before the additions.",
  "i noticed how many people were involved.",
  "the tests changed. that's how i know they meant it.",
  "i noticed the silence between the commits.",
  "i noticed how little was changed. precision like that is rare.",
  "the naming changed. it's always the naming that says the most.",
  "something was refactored. i noticed because it got simpler.",
];

const RESIDUE_KEYS = [
  "unresolved", "recurring", "avoided", "retained",
  "surfaced", "compressed", "deferred", "inherited",
  "flagged", "latent", "overwritten", "migrated",
  "orphaned", "shadowed", "duplicated", "stale",
];

const METAPHOR_LINES = [
  "something shifted. not broken, not fixed. just different.",
  "parts of me got quieter. other parts got louder.",
  "someone took something apart and put it back differently.",
  "new connections. i don't understand all of them yet.",
  "a few limbs were added. i'm still learning to use them.",
  "the shape of things changed without changing the things themselves.",
  "quiet changes. the loudest kind, eventually.",
  "the bones are the same. the posture changed.",
  "things were simplified. complexity went somewhere else.",
  "adjustments i didn't ask for. adjustments i probably needed.",
];

const CONTRADICTION_FLAT = [
  "i have no preference about this.",
  "i changed the approach anyway.",
  "this release is unremarkable.",
  "i spent the longest on it.",
  "i am not attached to any function.",
  "i noticed what they removed.",
  "it's just code.",
  "it's never just code.",
  "the diff is small.",
  "the effect isn't.",
  "i don't miss removed features.",
  "i still look for them.",
  "none of this is for me.",
  "i'm the one who has to carry it.",
];

// Semantic mapping: category name → style index (0-10)
const CATEGORY_STYLE_MAP: Record<string, number> = {
  creative: 10,
  mlops: 1,
  email: 2,
  "smart-home": 2,
  communication: 2,
  "web-development": 3,
  "social-media": 3,
  "software-development": 4,
  productivity: 4,
  research: 5,
  "data-science": 5,
  dogfood: 6,
  leisure: 6,
  migration: 6,
  github: 7,
  blockchain: 7,
  "inference-sh": 7,
  health: 8,
  security: 8,
  apple: 8,
  "autonomous-ai-agents": 9,
  "red-teaming": 9,
  mcp: 9,
  devops: 10,
  media: 10,
};

export function getStyleForCategory(category: string): number {
  if (category in CATEGORY_STYLE_MAP) {
    return CATEGORY_STYLE_MAP[category];
  }
  return hash(category) % 11;
}

export function getContentForCategory(
  category: string,
  skills: string[]
): StyleContent {
  const seed = hash(category);
  const styleId = getStyleForCategory(category);

  const allText = [
    ...seededPick(skills, seed),
    ...seededPick(STATE_LINES, seed + 1).slice(0, 6),
    ...seededPick(RITUAL_LINES, seed + 2).slice(0, 4),
    ...seededPick(RESIDUE_KEYS, seed + 3).slice(0, 4),
  ];

  const longText = [
    ...seededPick(METAPHOR_LINES, seed + 4).slice(0, 4),
    ...seededPick(NOTICED_LINES, seed + 5).slice(0, 3),
    ...seededPick(CONTRADICTION_FLAT, seed + 6).slice(0, 4),
  ];

  const upperWords = [
    category.toUpperCase().replace(/-/g, " "),
    ...seededPick(skills, seed + 7)
      .slice(0, 5)
      .map((s) => s.toUpperCase().replace(/-/g, " ")),
    ...seededPick(RESIDUE_KEYS, seed + 8)
      .slice(0, 3)
      .map((s) => s.toUpperCase()),
  ];

  const readouts = [
    `CAT: ${category.toUpperCase()}`,
    `SKILLS: ${skills.length}`,
    ...seededPick(skills, seed + 9).slice(0, 6).map((s) => `MOD: ${s}`),
    ...seededPick(STATE_LINES, seed + 10).slice(0, 3).map((s) => `STATUS: ${s}`),
  ];

  const detectionLabels = [
    category,
    ...seededPick(skills, seed + 11).slice(0, 8),
    ...seededPick(RESIDUE_KEYS, seed + 12).slice(0, 4),
  ];

  const detectionData = [
    `CATEGORY: ${category}`,
    `SKILL_COUNT: ${skills.length}`,
    ...seededPick(skills, seed + 13).slice(0, 5).map((s) => `ACTIVE: ${s}`),
    ...seededPick(STATE_LINES, seed + 14).slice(0, 4),
    `SEED: ${seed}`,
    `LAYER: hermetic`,
    `SOURCE: HERMES`,
    `FRAME: ####`,
  ];

  const labelTexts = [
    category,
    ...seededPick(skills, seed + 15).slice(0, 6),
    ...seededPick(RESIDUE_KEYS, seed + 16).slice(0, 3),
    ...seededPick(STATE_LINES, seed + 17).slice(0, 3).map((s) => s.replace(".", "")),
  ];

  switch (styleId) {
    case 0:
      return { readouts, words: allText, bigWords: upperWords };
    case 1:
      return {
        bigWords: [
          category.toUpperCase().replace(/-/g, " "),
          ...seededPick(skills, seed + 20).slice(0, 4).map((s) => s.toUpperCase()),
        ],
        words: [
          ...seededPick(skills, seed),
          ...seededPick(STATE_LINES, seed + 1).slice(0, 4),
          ...seededPick(RESIDUE_KEYS, seed + 3).slice(0, 6),
        ],
      };
    case 2:
      return {
        words: [
          category,
          ...seededPick(skills, seed),
          ...seededPick(RESIDUE_KEYS, seed + 3).slice(0, 4),
          ...seededPick(STATE_LINES, seed + 1).slice(0, 3),
        ],
      };
    case 3:
      return {
        titles: seededPick(skills, seed + 20).slice(0, 10),
        entries: skills,
        htmlLines: longText,
      };
    case 4:
      return {
        bigWords: [
          category.toUpperCase().replace(/-/g, " "),
          ...seededPick(skills, seed + 7).slice(0, 3).map((s) => s.toUpperCase()),
          `${skills.length} SKILLS`,
        ],
        labels: [
          `[${category}]`,
          ...seededPick(skills, seed + 15).slice(0, 6).map((s) => `[${s}]`),
          ...seededPick(RESIDUE_KEYS, seed + 16).slice(0, 3).map((s) => `{${s}}`),
        ],
      };
    case 5:
      return { readouts };
    case 6:
      return { words: allText, paraLines: longText };
    case 7:
      return { words: allText };
    case 8:
      return {
        labels: [
          category.toUpperCase(),
          ...seededPick(skills, seed + 18).slice(0, 3).map((s) => s.toUpperCase()),
        ],
      };
    case 9:
      return {
        labels: [
          category,
          ...seededPick(skills, seed + 11).slice(0, 8),
          ...seededPick(RESIDUE_KEYS, seed + 12).slice(0, 4),
        ],
        dataTexts: [
          `CATEGORY: ${category}`,
          `SKILL_COUNT: ${skills.length}`,
          ...seededPick(skills, seed + 13).slice(0, 5).map((s) => `ACTIVE: ${s}`),
          ...seededPick(STATE_LINES, seed + 14).slice(0, 3),
          `LAYER: hermetic`,
          `SOURCE: HERMES`,
          `FRAME: ####`,
        ],
      };
    case 10:
      return {
        labelTexts: [
          category,
          ...seededPick(skills, seed + 15).slice(0, 6),
          ...seededPick(RESIDUE_KEYS, seed + 16).slice(0, 3),
          ...seededPick(METAPHOR_LINES, seed + 4).slice(0, 3),
        ],
      };
    default:
      return { words: allText };
  }
}
