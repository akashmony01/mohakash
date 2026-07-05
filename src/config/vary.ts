// Deterministic per-item variation. We can't use Math.random (it would reshuffle
// the layout every build); instead we hash the item's stable id and use it to
// pick a value from a set of tiers. Same id → same tier on every build, but
// spread across items so card heights differ noticeably.
function hashStr(s = ''): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministically pick one tier for a given id.
export function pickTier<T>(id: string, tiers: T[]): T {
  return tiers[hashStr(id) % tiers.length];
}
