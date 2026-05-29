export type ChatInlineSegmentType = 'text' | 'strong' | 'em' | 'code';

export interface ChatInlineSegment {
  type: ChatInlineSegmentType;
  content: string;
}

export interface ChatListItem {
  content: ChatInlineSegment[];
  nestedList?: {
    type: 'unordered-list' | 'ordered-list';
    items: ChatListItem[];
  };
}

export type ChatContentBlock =
  | { type: 'paragraph'; content: ChatInlineSegment[] }
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; content: ChatInlineSegment[] }
  | { type: 'unordered-list'; items: ChatListItem[] }
  | { type: 'ordered-list'; items: ChatListItem[] }
  | { type: 'table'; header: ChatInlineSegment[][]; rows: ChatInlineSegment[][][] }
  | { type: 'code'; language?: string; content: string };

const BULLET_PATTERN = /^\s*[-*•]\s+(.*)$/;
const ORDERED_PATTERN = /^\s*\d+[.)]\s+(.*)$/;
const HEADING_PATTERN = /^\s*(#{1,6})\s+(.*)$/;
const CODE_FENCE_PATTERN = /^\s*```([\w-]+)?\s*$/;
const TABLE_DIVIDER_CELL_PATTERN = /^:?-{3,}:?$/;

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

function getLineIndent(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function findNextNonBlankIndex(lines: string[], startIndex: number): number {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (!isBlank(lines[index])) return index;
  }
  return -1;
}

function parseTableCells(line: string): string[] {
  const parts = line.trim().split('|');
  if (parts[0]?.trim() === '') parts.shift();
  if (parts[parts.length - 1]?.trim() === '') parts.pop();
  return parts.map((part) => part.trim());
}

function isTableDividerCell(cell: string): boolean {
  return TABLE_DIVIDER_CELL_PATTERN.test(cell.replace(/\s+/g, ''));
}

function isTableDividerRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => isTableDividerCell(cell));
}

function isLikelyTableLine(line: string): boolean {
  if (!line.includes('|') || isBlank(line)) return false;
  if (isBulletLine(line) || isOrderedLine(line) || isHeadingLine(line) || isCodeFence(line)) return false;
  return parseTableCells(line).length >= 2;
}

function collectTableRows(lines: string[], startIndex: number) {
  const rows: string[][] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (!isLikelyTableLine(line)) break;
    const cells = parseTableCells(line);
    if (cells.length < 2) break;
    rows.push(cells);
    index += 1;
  }

  if (rows.length < 2) return null;

  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const normalize = (row: string[]) => [...row, ...Array.from({ length: maxCols - row.length }, () => '')];

  const normalizedRows = rows.map(normalize);
  const header = normalizedRows[0];
  const bodyCandidate = normalizedRows.slice(1);
  const bodyRows = bodyCandidate.filter((row, idx) => !(idx === 0 && isTableDividerRow(row)));

  if (!bodyRows.length) return null;

  return {
    header: header.map((cell) => parseInlineSegments(cell)),
    rows: bodyRows.map((row) => row.map((cell) => parseInlineSegments(cell))),
    nextIndex: index,
  };
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
  const items: ChatListItem[] = [];
  let index = startIndex;
  const matcher = ordered ? ORDERED_PATTERN : BULLET_PATTERN;
  const nestedMatcher = ordered ? BULLET_PATTERN : ORDERED_PATTERN;
  const nestedType = ordered ? 'unordered-list' : 'ordered-list';

  while (index < lines.length) {
    while (index < lines.length && isBlank(lines[index])) {
      index += 1;
    }
    if (index >= lines.length) break;

    const line = lines[index];
    const match = line.match(matcher);
    if (!match) break;

    const itemIndent = getLineIndent(line);
    const parts = [match[1].trim()];
    const nestedItems: string[] = [];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];
      const nextIndent = getLineIndent(nextLine);

      if (isCodeFence(nextLine) || isHeadingLine(nextLine)) {
        break;
      }

      if (isBlank(nextLine)) {
        const nextNonBlankIndex = findNextNonBlankIndex(lines, index + 1);
        if (nextNonBlankIndex === -1) {
          index = lines.length;
          break;
        }

        const nextNonBlankLine = lines[nextNonBlankIndex];
        const nextNonBlankIndent = getLineIndent(nextNonBlankLine);

        if (nextNonBlankLine.match(matcher) && nextNonBlankIndent <= itemIndent) {
          index = nextNonBlankIndex;
          break;
        }

        index = nextNonBlankIndex;
        continue;
      }

      const nestedMatch = nextLine.match(nestedMatcher);
      if (nestedMatch && nextIndent > itemIndent) {
        nestedItems.push(nestedMatch[1].trim());
        index += 1;
        continue;
      }

      if (
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

    const item: ChatListItem = {
      content: parseInlineSegments(parts.join(' ')),
    };

    if (nestedItems.length) {
      item.nestedList = {
        type: nestedType,
        items: nestedItems.map((nestedItem) => ({
          content: parseInlineSegments(nestedItem),
        })),
      };
    }

    items.push(item);
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
        level: Math.min(headingMatch[1].length, 6) as 1 | 2 | 3 | 4 | 5 | 6,
        content: parseInlineSegments(headingMatch[2].trim()),
      });
      index += 1;
      continue;
    }

    if (isLikelyTableLine(line)) {
      const table = collectTableRows(lines, index);
      if (table) {
        blocks.push({
          type: 'table',
          header: table.header,
          rows: table.rows,
        });
        index = table.nextIndex;
        continue;
      }
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
        isCodeFence(nextLine) ||
        isLikelyTableLine(nextLine)
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
