import { useWindowDimensions } from 'react-native';
import { FilterXSS } from 'xss';

const sanitizer = new FilterXSS({
  whiteList: { p: [], div: [], br: [], b: [], strong: [], i: [], em: [], u: [], s: [], blockquote: [], ul: [], ol: [], li: [], h1: [], h2: [], h3: [], h4: [], pre: [], code: [] },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object'],
});

export const sanitizeHtml = (html: string) => sanitizer.process(html);
export const stripHtmlTags = (html: string) => sanitizeHtml(html).replace(/<[^>]*>/g, '').replace(/&(?:nbsp|#160|#x0*a0|#8203|#x200b);/gi, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[\s\u200b-\u200d\ufeff]+/g, ' ').trim();

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  return { width, height, fontScale, wp: (value: number) => Math.min(width, 720) * value / 100, hp: (value: number) => height * value / 100 };
}

export const normalizeSearch = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase().slice(0, 100);
export const wp = (percentage: number) => percentage;
export const hp = (percentage: number) => percentage;
export const extractHashtags = (value: string) => [...new Set([...stripHtmlTags(value).matchAll(/(?:^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]{1,50})/gu)].map(match => match[1].toLocaleLowerCase()))].slice(0, 20);
export const MENTION_PATTERN = /(?:^|[^\w])@([a-z0-9_]{3,30})/gi;
export const extractMentions = (value: string) => [...new Set([...stripHtmlTags(value).matchAll(MENTION_PATTERN)].map(match => match[1].toLowerCase()))].slice(0, 20);
export type TextSegment = { text: string; mention: string | null };
export function splitMentions(value: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of value.matchAll(MENTION_PATTERN)) {
    const start = (match.index ?? 0) + match[0].length - match[1].length - 1;
    if (start > cursor) segments.push({ text: value.slice(cursor, start), mention: null });
    segments.push({ text: value.slice(start, start + match[1].length + 1), mention: match[1].toLowerCase() });
    cursor = start + match[1].length + 1;
  }
  if (cursor < value.length) segments.push({ text: value.slice(cursor), mention: null });
  return segments;
}

export function relativeTime(value: string, language: 'en' | 'sq' = 'en', now = Date.now()) {
  const seconds = Math.min(0, Math.round((new Date(value).getTime() - now) / 1000));
  if (!Number.isFinite(seconds)) return '';
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (Math.abs(seconds) < 86400) return formatter.format(Math.round(seconds / 3600), 'hour');
  return formatter.format(Math.round(seconds / 86400), 'day');
}
