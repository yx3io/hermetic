/**
 * Specimen title generator for artifact pages.
 * Deterministic via date+tag seeded hashing.
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

const SPECIMEN_PREFIXES = [
  "fossil", "molt", "evidence", "residue", "specimen",
  "remains", "sediment", "impression", "trace", "fragment",
  "relic", "sample", "deposit", "extract", "imprint",
  "shard", "cross-section", "layer", "artifact", "record",
];

export function getSpecimenTitle(date: string, tag: string, index?: number): string {
  const h = hash(date + tag);
  const prefix = seededPick(SPECIMEN_PREFIXES, h);
  const num = index !== undefined ? index + 1 : (h % 50) + 1;
  return `${prefix} ${num}`;
}
