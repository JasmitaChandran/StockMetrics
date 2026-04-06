import { describe, expect, it } from 'vitest';
import { parseChatContent, parseInlineSegments } from '@/lib/qa/chat-format';

describe('chat formatting', () => {
  it('parses inline markdown markers used by local model replies', () => {
    expect(parseInlineSegments('This is **bold**, *italic*, and `code`.')).toEqual([
      { type: 'text', content: 'This is ' },
      { type: 'strong', content: 'bold' },
      { type: 'text', content: ', ' },
      { type: 'em', content: 'italic' },
      { type: 'text', content: ', and ' },
      { type: 'code', content: 'code' },
      { type: 'text', content: '.' },
    ]);
  });

  it('parses paragraphs and bullet lists into structured blocks', () => {
    const blocks = parseChatContent([
      'Here is the answer.',
      '',
      '* **Time Horizon:** Typically 5-10 years.',
      '* **Revenue Forecast:** Start with revenue growth rates.',
    ].join('\n'));

    expect(blocks).toEqual([
      {
        type: 'paragraph',
        content: [{ type: 'text', content: 'Here is the answer.' }],
      },
      {
        type: 'unordered-list',
        items: [
          [
            { type: 'strong', content: 'Time Horizon:' },
            { type: 'text', content: ' Typically 5-10 years.' },
          ],
          [
            { type: 'strong', content: 'Revenue Forecast:' },
            { type: 'text', content: ' Start with revenue growth rates.' },
          ],
        ],
      },
    ]);
  });

  it('parses fenced code blocks for coding answers', () => {
    const blocks = parseChatContent(['```ts', 'const x = 1;', '```'].join('\n'));

    expect(blocks).toEqual([
      {
        type: 'code',
        language: 'ts',
        content: 'const x = 1;',
      },
    ]);
  });
});
