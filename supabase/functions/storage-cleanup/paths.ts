const SAFE_PATH = /^[0-9a-f-]{36}\/[A-Za-z0-9_-][A-Za-z0-9/._-]*$/;

export function isSafeCleanupPath(path: unknown): path is string {
  return typeof path === 'string' && path.length <= 500 && SAFE_PATH.test(path) && !path.includes('..') && !path.includes('//');
}

export function claimedPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const path = item && typeof item === 'object' ? (item as Record<string, unknown>).path : item;
    return isSafeCleanupPath(path) ? [path] : [];
  });
}

export type RemovalOutcome = { removed: string[]; failed: string[]; missing: number };

export function partitionRemoval(requested: string[], deleted: unknown, failed: boolean): RemovalOutcome {
  if (failed) return { removed: [], failed: requested, missing: 0 };
  const reported = new Set(Array.isArray(deleted) ? deleted.flatMap(item => item && typeof item === 'object' && typeof (item as Record<string, unknown>).name === 'string' ? [(item as Record<string, string>).name] : []) : []);
  return { removed: requested, failed: [], missing: requested.filter(path => !reported.has(path)).length };
}
