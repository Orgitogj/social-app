export type Cursor = { created_at: string; id: string };
export type Page<T> = { items: T[]; nextCursor: Cursor | null };

export function deduplicate<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
}

export function pageFrom<T extends Cursor>(items: T[], limit: number): Page<T> {
  const last = items.at(-1);
  return { items: deduplicate(items), nextCursor: items.length === limit && last ? { created_at: last.created_at, id: last.id } : null };
}

export function mergeRealtime<T extends Cursor>(page: Page<T>, item: T): Page<T> {
  const items = deduplicate([item, ...page.items]).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  return { ...page, items };
}

export class RequestSequence {
  private sequence = 0;
  next() { this.sequence += 1; return this.sequence; }
  current(value: number) { return this.sequence === value; }
  cancel() { this.sequence += 1; }
}

export class MutationLock {
  private keys = new Set<string>();
  acquire(key: string) { if (this.keys.has(key)) return false; this.keys.add(key); return true; }
  release(key: string) { this.keys.delete(key); }
}
