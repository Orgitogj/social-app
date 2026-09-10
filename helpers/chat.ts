export function formatChatDate(value: string, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const difference = Math.round((today - target) / 86_400_000);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Yesterday';
  if (difference < 7) return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(date);
}

export function formatMessageTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function isNewDate(previous: string | undefined, current: string) {
  if (!previous) return true;
  const before = new Date(previous);
  const now = new Date(current);
  return before.getFullYear() !== now.getFullYear() || before.getMonth() !== now.getMonth() || before.getDate() !== now.getDate();
}
