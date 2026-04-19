import { Platform } from '@prisma/client';
import { getCharLimit, supportsThreading } from '@relayman/platform-matrix';

export interface AdaptedChunk {
  text: string;
  isThread: boolean;
  index: number;
  total: number;
}

/**
 * Adapts raw post content to fit a target platform.
 * Returns an array of chunks (1 chunk = 1 post, >1 = thread).
 *
 * All char limits and thread-support flags come from @relayman/platform-matrix
 * — the single source of truth shared with the web app.
 */
export function adaptContent(rawText: string, platform: Platform): AdaptedChunk[] {
  const limit = getCharLimit(platform);
  const threadSupport = supportsThreading(platform);

  if (rawText.length <= limit) {
    return [{ text: rawText, isThread: false, index: 0, total: 1 }];
  }

  if (!threadSupport) {
    const truncated = truncateAtBoundary(rawText, limit - 3) + '...';
    return [{ text: truncated, isThread: false, index: 0, total: 1 }];
  }

  const chunks = splitIntoChunks(rawText, limit);
  return chunks.map((text, i) => ({
    text,
    isThread: chunks.length > 1,
    index: i,
    total: chunks.length,
  }));
}

function truncateAtBoundary(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const sentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (sentenceEnd > maxLen * 0.6) return text.slice(0, sentenceEnd + 1);
  const wordEnd = slice.lastIndexOf(' ');
  if (wordEnd > maxLen * 0.5) return text.slice(0, wordEnd);
  return slice;
}

function splitIntoChunks(text: string, limit: number): string[] {
  const counterLen = 8; // worst case " (10/10)"
  const effectiveLimit = limit - counterLen;
  const words = text.split(' ');
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= effectiveLimit) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = word.length > effectiveLimit ? word.slice(0, effectiveLimit) : word;
    }
  }
  if (current) chunks.push(current);

  const total = chunks.length;
  if (total > 1) {
    return chunks.map((c, i) => `${c} (${i + 1}/${total})`);
  }
  return chunks;
}
