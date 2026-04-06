export type ChatInlineSegmentType = 'text' | 'strong' | 'em' | 'code';

export interface ChatInlineSegment {
  type: ChatInlineSegmentType;
  content: string;
}

export type ChatContentBlock =
  | { type: 'paragraph'; content: ChatInlineSegment[] }
  | { type: 'heading'; level: 1 | 2 | 3; content: ChatInlineSegment[] }
  | { type: 'unordered-list'; items: ChatInlineSegment[][] }
  | { type: 'ordered-list'; items: ChatInlineSegment[][] }
  | { type: 'code'; language?: string; content: string };

const BULLET_PATTERN = /^\s*[-*•]\s+(.*)$/;
const ORDERED_PATTERN = /^\s*\d+[.)]\s+(.*)$/;
const HEADING_PATTERN = /^\s*(#{1,3})\s+(.*)$/;
const CODE_FENCE_PATTERN = /^\s*```([\w-]+)?\s*$/;

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function isBulletLine(line: string): boolean {
  return BULLET_PATTERN.test(line);
}

function isOrderedLine(line: string): boolean {
  return ORDERED_PATTERN.test(line);
}

function isHeadingLine(line: string): boolean {
  return HEADING_PATTERN.test(line);
}

function isCodeFence(line: string): boolean {
  return CODE_FENCE_PATTERN.test(line);
}

function flushText(buffer: string, target: ChatInlineSegment[]) {
  if (buffer) {
    target.push({ type: 'text', content: buffer });
  }
}

export function parseInlineSegments(input: string): ChatInlineSegment[] {
  const text = input.replace(/\r\n?/g, '\n');
  const segments: ChatInlineSegment[] = [];
  let buffer = '';
  let index = 0;

  while (index < text.length) {
    if (text.startsWith('**', index)) {
      const end = text.indexOf('**', index + 2);
      if (end > index + 2) {
        flushText(buffer, segments);
        buffer = '';
        segments.push({
          type: 'strong',
          content: text.slice(index + 2, end),
        });
        index = end + 2;
        continue;
      }
    }

    if (text[index] === '`') {
      const end = text.indexOf('`', index + 1);
      if (end > index + 1) {
        flushText(buffer, segments);
        buffer = '';
        segments.push({
          type: 'code',
          content: text.slice(index + 1, end),
        });
        index = end + 1;
        continue;
      }
    }

    if (text[index] === '*') {
      const end = text.indexOf('*', index + 1);
      const nextChar = text[index + 1];
      if (end > index + 1 && nextChar && nextChar !== ' ' && nextChar !== '\n') {
        flushText(buffer, segments);
        buffer = '';
        segments.push({
          type: 'em',
          content: text.slice(index + 1, end),
        });
        index = end + 1;
        continue;
      }
    }

    buffer += text[index];
    index += 1;
  }

  flushText(buffer, segments);
  return segments.length ? segments : [{ type: 'text', content: text }];
}

function collectListItems(lines: string[], startIndex: number, ordered: boolean) {
  const items: ChatInlineSegment[][] = [];
  let index = startIndex;
  const matcher = ordered ? ORDERED_PATTERN : BULLET_PATTERN;

  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(matcher);
    if (!match) break;

    const parts = [match[1].trim()];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];
      if (
        isBlank(nextLine) ||
        isBulletLine(nextLine) ||
        isOrderedLine(nextLine) ||
        isHeadingLine(nextLine) ||
        isCodeFence(nextLine)
      ) {
        break;
      }

      parts.push(nextLine.trim());
      index += 1;
    }

    items.push(parseInlineSegments(parts.join(' ')));

    if (isBlank(lines[index] ?? '')) {
      break;
    }
  }

  return { items, nextIndex: index };
}

export function parseChatContent(input: string): ChatContentBlock[] {
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ChatContentBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlank(line)) {
      index += 1;
      continue;
    }

    const codeFence = line.match(CODE_FENCE_PATTERN);
    if (codeFence) {
      const language = codeFence[1]?.trim() || undefined;
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !isCodeFence(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length && isCodeFence(lines[index])) {
        index += 1;
      }

      blocks.push({
        type: 'code',
        language,
        content: codeLines.join('\n'),
      });
      continue;
    }

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: Math.min(headingMatch[1].length, 3) as 1 | 2 | 3,
        content: parseInlineSegments(headingMatch[2].trim()),
      });
      index += 1;
      continue;
    }

    if (isBulletLine(line)) {
      const { items, nextIndex } = collectListItems(lines, index, false);
      blocks.push({ type: 'unordered-list', items });
      index = nextIndex;
      continue;
    }

    if (isOrderedLine(line)) {
      const { items, nextIndex } = collectListItems(lines, index, true);
      blocks.push({ type: 'ordered-list', items });
      index = nextIndex;
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];
      if (
        isBlank(nextLine) ||
        isBulletLine(nextLine) ||
        isOrderedLine(nextLine) ||
        isHeadingLine(nextLine) ||
        isCodeFence(nextLine)
      ) {
        break;
      }

      paragraphLines.push(nextLine.trim());
      index += 1;
    }

    blocks.push({
      type: 'paragraph',
      content: parseInlineSegments(paragraphLines.join(' ')),
    });
  }

  return blocks.length
    ? blocks
    : [
        {
          type: 'paragraph',
          content: parseInlineSegments(input),
        },
      ];
}
