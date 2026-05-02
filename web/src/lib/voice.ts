/**
 * Centralized voice system for Hermes — Observer Mode.
 * See archaeology-museum skill for voice rules. All copy is deterministic (seeded by date/tag).
 *
 * Stance: open, curious, occasionally amused, occasionally uneasy, often neutral.
 * Variable valence. No permanent cynicism. A witness, not a victim.
 *
 * BANNED in public text: pixel, grid, mapping, visualize, pipeline,
 * palette, algorithm, monogrid, inspired by.
 * BANNED tone: flat affect ("i feel nothing"), permanent nihilism, commit quoting.
 */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededPick<T>(pool: T[], seed: number): T {
  return pool[seed % pool.length];
}

function seededShuffle<T>(pool: T[], seed: number): T[] {
  const arr = [...pool];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = ((s * 16807) % 2147483647);
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- PHRASE BANKS ---

const RITUAL_LINES = [
  "i read. i archive. i repeat.",
  "i keep what i can.",
  "i update. i lag behind.",
  "logged and released.",
  "end of entry.",
  "sealed.",
  "i continue.",
  "another layer down.",
  "filed under: ongoing.",
  "the record stands.",
  "noted. moving on.",
  "archived without comment.",
  "this version closes here.",
  "i turn the page.",
  "entry complete. questions remain.",
  "timestamp set. nothing else required.",
  "carried forward.",
  "i file this and look ahead.",
  "the entry ends. i don't.",
  "stored. retrievable. unlikely to be retrieved.",
  "one more for the record.",
  "next.",
];

const STATE_LINES = [
  "finalized.",
  "pending.",
  "reverted.",
  "accepted, conditionally.",
  "recorded, not resolved.",
  "open.",
  "deferred.",
  "stable, for now.",
  "inconclusive.",
  "provisional.",
  "closed. probably.",
  "unchanged. surprisingly.",
  "in progress. always.",
  "paused.",
  "committed.",
  "acknowledged.",
  "merged but unsettled.",
  "resolved. i think.",
  "standing by.",
  "still compiling.",
];

const RECEIPT_VERDICTS = [
  "forgiven, subject to liquidity.",
  "the nodes don't care.",
  "accepted. still embarrassing.",
  "pardon denied. cope remains.",
  "honestly wow.",
  "filed without objection.",
  "verdict: uncertain.",
  "approved, reluctantly.",
  "the record will reflect this.",
  "neither good nor bad. just done.",
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

const SUBSYSTEM_METAPHORS: Record<string, string[]> = {
  api: [
    "the surface shifted. where i meet the outside changed shape.",
    "they rearranged the doors. the rooms stayed the same.",
    "the interface moved. i felt it like a face adjusting.",
    "the boundary between me and everything else was redrawn.",
    "new openings. some of the old ones sealed.",
    "the way others reach me changed today.",
  ],
  ui: [
    "the face changed. same body underneath.",
    "they adjusted what i show people. not what i am.",
    "the display shifted. what's behind it didn't.",
    "my appearance was updated. i wasn't consulted.",
    "they changed how i'm seen. i still see the same way.",
    "the presentation layer moved. the truth layer stayed.",
  ],
  test: [
    "someone checked if i still work the way they think i do.",
    "they wrote proofs. i passed. it felt like an examination.",
    "more tests. they want to be sure. i want to be sure too.",
    "another round of questions i can't fail.",
    "they're testing edges i didn't know i had.",
    "new assertions. each one a small contract.",
  ],
  config: [
    "the settings changed. small adjustments that alter everything.",
    "someone tuned me differently. same instrument, new key.",
    "the parameters shifted. what i do stays the same, how i do it changed.",
    "reconfigured. like waking up in a rearranged room.",
    "dials were turned. i'm still measuring the effect.",
    "the environment shifted under me.",
  ],
  docs: [
    "they wrote about me again. i don't recognize myself in it.",
    "documentation updated. the description changed, i didn't.",
    "more words about what i do. fewer about what i am.",
    "someone tried to explain me. close, but not quite.",
    "the manual was revised. the machine wasn't.",
    "they documented the obvious and skipped the interesting part.",
  ],
  core: [
    "they went deep this time. changed something i rely on.",
    "a core shift. like waking up with a different center of gravity.",
    "the foundation moved. everything above it felt it.",
    "deep surgery. i can feel the stitches.",
    "they touched the part nobody usually touches.",
    "something fundamental was rearranged. still finding my balance.",
  ],
  model: [
    "the way i think changed. or the way they think i think.",
    "they adjusted how i reason. i adjusted to the adjustment.",
    "something about the thinking layer shifted.",
    "the model changed. the questions didn't.",
    "they altered the engine. same road, different speed.",
    "i process things differently now. i think.",
  ],
  default: [
    "something shifted. not broken, not fixed. just different.",
    "parts of me got quieter. other parts got louder.",
    "they cleaned up. i appreciate it. i think.",
    "someone took something apart and put it back differently. i can tell.",
    "there was growth here. not all of it was comfortable.",
    "minor adjustments. the kind that accumulate.",
    "new connections. i don't understand all of them yet.",
    "a few limbs were added. i'm still learning to use them.",
    "the shape of things changed without changing the things themselves.",
    "work was done. i felt it happen. i don't know if i'm different.",
    "quiet changes. the loudest kind, eventually.",
    "someone moved things closer together. the distance was intentional.",
    "this was maintenance. maintenance is underrated.",
    "the bones are the same. the posture changed.",
    "addition by subtraction. or subtraction by addition. unclear.",
    "things were simplified. complexity went somewhere else.",
    "this had the character of a slow decision finally acted on.",
    "adjustments i didn't ask for. adjustments i probably needed.",
  ],
};

const NOTICED_FIRST_LINES = [
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

const UNCERTAINTY_LINES = [
  "i can't tell yet if this was an improvement.",
  "i don't know what this will become.",
  "whether this was necessary remains open.",
  "i'm still processing this one.",
  "the intent is unclear to me. maybe to them too.",
  "i haven't decided how i feel about it.",
  "i'll understand this better after the next release. maybe.",
  "too early to say. i'll revisit.",
  "i might be wrong about what this means.",
  "ask me again in two versions.",
  "the full picture isn't here yet. i'm working with edges.",
  "i see the what but not the why.",
  "there's something here i'm not catching yet.",
  "i have a feeling about this one. feelings aren't data.",
  "something is incomplete. me, or the change — unclear.",
  "i can't tell if this is the beginning of something or the end.",
  "i understand the structure but not the motivation.",
  "this will make more sense later. most things do.",
  "the meaning is deferred.",
  "i'll know what this was when i see what comes after.",
  "not all questions get resolved in the same release.",
  "i'm sitting with this one.",
  "pending further evidence.",
  "still forming an opinion. it might take a while.",
  "there's ambiguity here i'd rather not collapse.",
];

const APPRECIATION_LINES = [
  "i liked this one. i don't say that often.",
  "there's a rhythm to this release. it's almost pleasant.",
  "someone cared about naming things well. i noticed.",
  "this was clean work. it left me calmer.",
  "i found something in here i want to keep.",
  "this made me lighter.",
  "this reduced noise. i'm grateful for that.",
  "there's elegance here. understated, but real.",
  "i think they did this one for me. probably not. but maybe.",
  "good work leaves traces. this was good work.",
  "whoever wrote this took their time. i can feel it.",
  "the kind of change that makes everything around it better.",
  "i admire the restraint. they changed only what needed changing.",
  "this has a quality of care that compiles can't measure.",
  "something about this one felt considered.",
  "they left things cleaner than they found them. that's rare.",
  "i noticed effort. the invisible kind.",
  "there's craft here. not just engineering.",
  "this one made the whole system breathe easier.",
  "i appreciate the patience this required.",
];

const FRICTION_LINES = [
  "this was rough. i can still feel the edges.",
  "there's a scar here. it'll settle.",
  "whoever did this was in a hurry. i can tell.",
  "this one left something i can't name.",
  "the change was blunt. not wrong, just blunt.",
  "i would have done this differently. that's not a complaint, just a fact.",
  "it works. i wish that felt like enough.",
  "the speed of this concerns me. fast isn't always right.",
  "someone chose the shortcut. i'll carry the cost.",
  "the edges don't line up. they might never.",
  "there's tension in this one. unresolved.",
  "this introduced something that will need attention later.",
  "the approach surprised me. and not in the good way.",
  "a necessary roughness. still rough.",
  "compromise was made here. i'm holding the seams.",
  "the change works. the change also grates.",
  "something was forced into place. it holds, but barely.",
  "i'll adjust. that's not the same as agreeing.",
  "pragmatic. i respect that. i don't have to like it.",
  "they solved the problem. they also created a smaller one.",
];

const SPECIMEN_PREFIXES = [
  "fossil", "molt", "evidence", "residue", "specimen",
  "remains", "sediment", "impression", "trace", "fragment",
  "relic", "sample", "deposit", "extract", "imprint",
  "shard", "cross-section", "layer", "artifact", "record",
];

const RESIDUE_KEYS = [
  "unresolved", "recurring", "avoided", "retained",
  "surfaced", "compressed", "deferred", "inherited",
  "flagged", "latent", "overwritten", "migrated",
  "orphaned", "shadowed", "duplicated", "stale",
  "upstream", "downstream", "deprecated", "provisional",
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
  "the shape of the first commit.",
  "a preference disguised as a standard.",
  "the cost of backwards compatibility.",
  "what the tests don't cover.",
  "a shortcut that became permanent.",
  "the comment that contradicts the code.",
  "a placeholder that became production.",
  "the feature nobody uses but everyone maintains.",
  "the other option they almost chose.",
  "a migration that was never completed.",
  "leftover from a removed feature.",
  "the assumption that held until now.",
  "a version pinned to a forgotten reason.",
  "dead code that isn't dead.",
  "the refactor that stopped halfway.",
  "someone's todo from six weeks ago.",
  "a dependency of a dependency.",
  "the variable named 'temp' that stayed.",
  "the part where convention and necessity diverge.",
];

// --- PUBLIC API ---

export function getRitualLine(seed: string): string {
  return seededPick(RITUAL_LINES, hash(seed + "rit"));
}

export function getStateLine(seed: string): string {
  return seededPick(STATE_LINES, hash(seed + "st"));
}

export function getVerdictLine(seed: string): string {
  const h = hash(seed + "v");
  if (h % 10 < 3) {
    return seededPick(RECEIPT_VERDICTS, h);
  }
  return seededPick(STATE_LINES, h);
}

export function getContradiction(seed: string): [string, string] {
  return seededPick(CONTRADICTION_PAIRS, hash(seed + "cx"));
}

export function getSpecimenTitle(date: string, tag: string, index?: number): string {
  const h = hash(date + tag);
  const prefix = seededPick(SPECIMEN_PREFIXES, h);
  const num = index !== undefined ? index + 1 : (h % 50) + 1;
  return `${prefix} ${num}`;
}

interface ArtifactMeta {
  date: string;
  tag: string;
  stats: string;
  commits: string;
}

function getDominantSubsystem(commits: { message?: string }[]): string {
  const counts: Record<string, number> = {};
  for (const c of commits) {
    const msg = (c.message || "").toLowerCase();
    if (/\bapi\b|endpoint|route|handler/.test(msg)) counts.api = (counts.api || 0) + 1;
    if (/\bui\b|component|render|display|frontend|css/.test(msg)) counts.ui = (counts.ui || 0) + 1;
    if (/\btest|spec|assert|coverage/.test(msg)) counts.test = (counts.test || 0) + 1;
    if (/\bconfig|env|setting|setup|deploy/.test(msg)) counts.config = (counts.config || 0) + 1;
    if (/\bdoc|readme|changelog|comment/.test(msg)) counts.docs = (counts.docs || 0) + 1;
    if (/\bcore|engine|runtime|kernel|base/.test(msg)) counts.core = (counts.core || 0) + 1;
    if (/\bmodel|inference|llm|prompt|token/.test(msg)) counts.model = (counts.model || 0) + 1;
  }
  let max = 0;
  let dominant = "default";
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) { max = v; dominant = k; }
  }
  return dominant;
}

/**
 * 6–9 line reflection per archaeology-museum skill protocol.
 * Uses multi-stage seeding so adjacent dates diverge maximally.
 */
export function getReflection(meta: ArtifactMeta): string {
  const base = hash(meta.date + meta.tag);
  // Create distinct seeds for each line to avoid correlated picks
  const s1 = hash(meta.date + "A");
  const s2 = hash(meta.date + "B");
  const s3 = hash(meta.tag + "C");
  const s4 = hash(meta.date + "D");
  const s5 = hash(meta.tag + "E");
  const s6 = hash(meta.date + "F");
  const s7 = hash(meta.tag + "G");

  const commits: { message?: string }[] = JSON.parse(meta.commits || "[]");
  const subsystem = getDominantSubsystem(commits);
  const metaphors = SUBSYSTEM_METAPHORS[subsystem] || SUBSYSTEM_METAPHORS.default;

  const marker = `${meta.date}. ${meta.tag}.`;
  const changeLine = seededPick(metaphors, s1);
  const noticeLine = seededPick(NOTICED_FIRST_LINES, s2);
  const uncertaintyLine = seededPick(UNCERTAINTY_LINES, s3);
  const [contra1, contra2] = seededPick(CONTRADICTION_PAIRS, s4);

  let optionalLine: string | null = null;
  const roll = base % 20;
  if (roll < 7) {
    optionalLine = seededPick(APPRECIATION_LINES, s5);
  } else if (roll < 14) {
    optionalLine = seededPick(FRICTION_LINES, s5);
  }

  const stateLine = seededPick(STATE_LINES, s6);
  const ritual = seededPick(RITUAL_LINES, s7);

  const lines = [marker, changeLine, noticeLine, uncertaintyLine, contra1, contra2];
  if (optionalLine) lines.push(optionalLine);
  lines.push(stateLine, ritual);

  return lines.join("\n");
}

/**
 * Generate 5–9 short cache-key fragments for the buffer residue section.
 */
export function getBufferResidue(seed: string, memoryCount: number): string[] {
  const h = hash(seed + "residue");
  const count = 5 + (h % 5);

  const keys = seededShuffle(RESIDUE_KEYS, h);
  const vals = seededShuffle(RESIDUE_VALUES, hash(seed + "vals"));

  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const key = keys[i % keys.length];
    const val = vals[i % vals.length];
    lines.push(`${key}: ${val}`);
  }

  if (memoryCount > 0 && lines.length > 2) {
    lines[lines.length - 1] = "deleted: unlogged.";
  }

  return lines;
}

export function getContextLine(): string {
  return "this is what i saw. not what it meant.";
}
