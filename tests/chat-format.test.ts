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
          {
            content: [
              { type: 'strong', content: 'Time Horizon:' },
              { type: 'text', content: ' Typically 5-10 years.' },
            ],
          },
          {
            content: [
              { type: 'strong', content: 'Revenue Forecast:' },
              { type: 'text', content: ' Start with revenue growth rates.' },
            ],
          },
        ],
      },
    ]);
  });

  it('keeps nested bullet details under ordered list items', () => {
    const blocks = parseChatContent([
      '1. **Equity Funds**',
      '   - Invest in stocks.',
      '',
      '1. **Bond Funds**',
      '   - Hold government or corporate bonds.',
    ].join('\n'));

    expect(blocks).toEqual([
      {
        type: 'ordered-list',
        items: [
          {
            content: [{ type: 'strong', content: 'Equity Funds' }],
            nestedList: {
              type: 'unordered-list',
              items: [{ content: [{ type: 'text', content: 'Invest in stocks.' }] }],
            },
          },
          {
            content: [{ type: 'strong', content: 'Bond Funds' }],
            nestedList: {
              type: 'unordered-list',
              items: [{ content: [{ type: 'text', content: 'Hold government or corporate bonds.' }] }],
            },
          },
        ],
      },
    ]);
  });

  it('parses level-4 headings and markdown tables', () => {
    const blocks = parseChatContent([
      '#### A. Growth Funds',
      '',
      '| Risk Level | Fund Type |',
      '| --- | --- |',
      '| Low | Money Market |',
      '| High | Aggressive Growth |',
    ].join('\n'));

    expect(blocks).toEqual([
      {
        type: 'heading',
        level: 4,
        content: [{ type: 'text', content: 'A. Growth Funds' }],
      },
      {
        type: 'table',
        header: [
          [{ type: 'text', content: 'Risk Level' }],
          [{ type: 'text', content: 'Fund Type' }],
        ],
        rows: [
          [
            [{ type: 'text', content: 'Low' }],
            [{ type: 'text', content: 'Money Market' }],
          ],
          [
            [{ type: 'text', content: 'High' }],
            [{ type: 'text', content: 'Aggressive Growth' }],
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
