import * as XLSX from 'xlsx';
import type { FinancialStatementTable } from '@/types';

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  headerBg:    '4338CA', // indigo-700
  headerFg:    'FFFFFF',
  subBg:       '6D28D9', // violet-700
  subFg:       'FFFFFF',
  bandA:       'EEF2FF', // indigo-50
  bandB:       'FFFFFF',
  totalBg:     'C7D2FE', // indigo-200
  totalFg:     '1E1B4B',
  green:       '15803D',
  red:         'B91C1C',
  dark:        '1E293B',
  coverBg:     '1E1B4B', // indigo-950
  coverFg:     'FFFFFF',
  coverAccent: 'A5B4FC',
  borderClr:   'C7D2FE',
} as const;

// ─── Style helpers ────────────────────────────────────────────────────────────

type CS = NonNullable<XLSX.CellObject['s']>;

const thin = (rgb: string) => ({ style: 'thin' as const, color: { rgb } });

const borders = (): CS['border'] => ({
  top:    thin(C.borderClr),
  bottom: thin(C.borderClr),
  left:   thin(C.borderClr),
  right:  thin(C.borderClr),
});

const fill = (rgb: string): CS['fill'] => ({ patternType: 'solid', fgColor: { rgb } });

function headerStyle(bg: string = C.headerBg, fg: string = C.headerFg): CS {
  return {
    font:      { name: 'Arial', bold: true, sz: 11, color: { rgb: fg } },
    fill:      fill(bg),
    alignment: { horizontal: 'center', vertical: 'center' },
    border:    borders(),
  };
}

function isTotalRow(label: string): boolean {
  return /\b(total|net|profit|loss|ebitda|pat|pbt|operating income|gross profit)\b/i.test(label);
}

function labelStyle(rowIdx: number, isTotal: boolean): CS {
  const bg = isTotal ? C.totalBg : rowIdx % 2 === 0 ? C.bandA : C.bandB;
  return {
    font:      { name: 'Arial', bold: isTotal, sz: 10, color: { rgb: isTotal ? C.totalFg : C.dark } },
    fill:      fill(bg),
    alignment: { horizontal: 'left', vertical: 'center', indent: isTotal ? 0 : 1 },
    border:    borders(),
  };
}

function valueStyle(value: number | null | undefined, rowIdx: number, isTotal: boolean): CS {
  const bg    = isTotal ? C.totalBg : rowIdx % 2 === 0 ? C.bandA : C.bandB;
  const fgRgb =
    value == null ? C.dark :
    value  >  0   ? C.green :
    value  <  0   ? C.red   : C.dark;

  return {
    font:      { name: 'Arial', bold: isTotal, sz: 10, color: { rgb: fgRgb } },
    fill:      fill(bg),
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt:    '#,##0.00;(#,##0.00);"-"',
    border:    borders(),
  };
}

// ─── Core sheet builder ───────────────────────────────────────────────────────

function buildStyledSheet(
  rows: FinancialStatementTable['rows'],
  years: string[],
  title: string,
): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const enc = XLSX.utils.encode_cell;
  const totalCols = 1 + years.length;

  // Row 0: sheet title (merged across all columns)
  ws[enc({ r: 0, c: 0 })] = {
    v: title, t: 's',
    s: {
      font:      { name: 'Arial', bold: true, sz: 14, color: { rgb: C.headerFg } },
      fill:      fill(C.coverBg),
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  };
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];

  // Row 1: column headers
  ws[enc({ r: 1, c: 0 })] = { v: 'Particulars', t: 's', s: headerStyle() };
  years.forEach((yr, ci) => {
    ws[enc({ r: 1, c: ci + 1 })] = { v: yr, t: 's', s: headerStyle() };
  });

  // Rows 2+: data
  rows.forEach((row, ri) => {
    const er      = ri + 2;
    const isTotal = isTotalRow(row.label);

    ws[enc({ r: er, c: 0 })] = { v: row.label, t: 's', s: labelStyle(ri, isTotal) };

    years.forEach((yr, ci) => {
      const raw    = row.valuesByYear?.[yr];
      const numVal = typeof raw === 'number' ? raw : null;
      ws[enc({ r: er, c: ci + 1 })] = {
        v: numVal ?? '',
        t: numVal == null ? 's' : 'n',
        s: valueStyle(numVal, ri, isTotal),
      };
    });
  });

  ws['!ref']  = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: 1 + rows.length, c: totalCols - 1 });
  ws['!cols'] = [{ wch: 36 }, ...years.map(() => ({ wch: 14 }))];
  ws['!rows'] = [{ hpt: 28 }, { hpt: 20 }, ...rows.map(() => ({ hpt: 18 }))];
  // Freeze header row + label column
  ws['!freeze'] = { xSplit: 1, ySplit: 2 } as never;

  return ws;
}

// ─── Cover sheet ─────────────────────────────────────────────────────────────

function buildCoverSheet(tables: FinancialStatementTable[], fileName: string): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const enc = XLSX.utils.encode_cell;

  ws[enc({ r: 0, c: 0 })] = {
    v: '📊  Financial Statement Export', t: 's',
    s: {
      font:      { name: 'Arial', bold: true, sz: 16, color: { rgb: C.coverFg } },
      fill:      fill(C.coverBg),
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  };
  ws[enc({ r: 1, c: 0 })] = {
    v: `Exported: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}   ·   ${fileName}`,
    t: 's',
    s: {
      font:      { name: 'Arial', italic: true, sz: 10, color: { rgb: C.coverAccent } },
      fill:      fill(C.coverBg),
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  };
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];

  // Table header (row 3, skipping row 2 as a spacer)
  ['Statement', 'View', 'Years Covered'].forEach((h, ci) => {
    ws[enc({ r: 3, c: ci })] = { v: h, t: 's', s: headerStyle(C.subBg, C.subFg) };
  });

  // One row per view per table
  let ri = 4;
  tables.forEach((table) => {
    const views: Array<{ label: string; years: string[] }> = [];
    if (table.viewData?.consolidated) views.push({ label: 'Consolidated', years: table.viewData.consolidated.years });
    if (table.viewData?.standalone)   views.push({ label: 'Standalone',   years: table.viewData.standalone.years });
    if (!views.length)                views.push({ label: '—',            years: table.years ?? [] });

    views.forEach((v) => {
      const bg: string = ri % 2 === 0 ? C.bandA : C.bandB;
      const cs: CS = {
        font:      { name: 'Arial', sz: 10, color: { rgb: C.dark } },
        fill:      fill(bg),
        alignment: { vertical: 'center' },
        border:    borders(),
      };
      ws[enc({ r: ri, c: 0 })] = { v: table.title,  t: 's', s: { ...cs, font: { ...cs.font, bold: true } } };
      ws[enc({ r: ri, c: 1 })] = { v: v.label,      t: 's', s: cs };
      ws[enc({ r: ri, c: 2 })] = { v: v.years.join(', ') || 'N/A', t: 's', s: cs };
      ri++;
    });
  });

  ws['!ref']  = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: ri, c: 2 });
  ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 42 }];
  ws['!rows'] = [{ hpt: 32 }, { hpt: 16 }, { hpt: 8 }, { hpt: 20 }];

  return ws;
}

function buildFullStatementSheet(table: FinancialStatementTable): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const enc = XLSX.utils.encode_cell;

  const views: Array<{ label: string; years: string[]; rows: FinancialStatementTable['rows'] }> = [];
  if (table.viewData?.consolidated) {
    views.push({ label: 'Consolidated', years: table.viewData.consolidated.years, rows: table.viewData.consolidated.rows });
  }
  if (table.viewData?.standalone) {
    views.push({ label: 'Standalone', years: table.viewData.standalone.years, rows: table.viewData.standalone.rows });
  }
  if (!views.length) {
    views.push({ label: 'Statement', years: table.years ?? [], rows: table.rows });
  }

  const totalCols = Math.max(2, ...views.map((view) => 1 + view.years.length));
  const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
  ws['!merges'] = merges;

  ws[enc({ r: 0, c: 0 })] = {
    v: `${table.title} – Full (Consolidated + Standalone)`,
    t: 's',
    s: {
      font:      { name: 'Arial', bold: true, sz: 14, color: { rgb: C.headerFg } },
      fill:      fill(C.coverBg),
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  };

  let cursor = 2;
  views.forEach((view, viewIndex) => {
    const sectionRow = cursor;
    merges.push({ s: { r: sectionRow, c: 0 }, e: { r: sectionRow, c: totalCols - 1 } });
    ws[enc({ r: sectionRow, c: 0 })] = { v: `${view.label} View`, t: 's', s: headerStyle(C.subBg, C.subFg) };

    const headerRow = sectionRow + 1;
    ws[enc({ r: headerRow, c: 0 })] = { v: 'Particulars', t: 's', s: headerStyle() };
    for (let col = 1; col < totalCols; col += 1) {
      ws[enc({ r: headerRow, c: col })] = { v: view.years[col - 1] ?? '', t: 's', s: headerStyle() };
    }

    const dataStartRow = headerRow + 1;
    view.rows.forEach((row, rowIndex) => {
      const excelRow = dataStartRow + rowIndex;
      const totalRow = isTotalRow(row.label);
      ws[enc({ r: excelRow, c: 0 })] = { v: row.label, t: 's', s: labelStyle(rowIndex, totalRow) };

      for (let col = 1; col < totalCols; col += 1) {
        const year = view.years[col - 1];
        const raw = year ? row.valuesByYear?.[year] : null;
        const numVal = typeof raw === 'number' ? raw : null;
        ws[enc({ r: excelRow, c: col })] = {
          v: numVal ?? '',
          t: numVal == null ? 's' : 'n',
          s: valueStyle(numVal, rowIndex, totalRow),
        };
      }
    });

    cursor = dataStartRow + view.rows.length;
    if (viewIndex < views.length - 1) cursor += 2;
  });

  const lastRow = Math.max(cursor - 1, 1);
  ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: lastRow, c: totalCols - 1 });
  ws['!cols'] = [{ wch: 36 }, ...Array.from({ length: totalCols - 1 }, () => ({ wch: 14 }))];
  ws['!rows'] = [{ hpt: 28 }, { hpt: 8 }];

  return ws;
}

// ─── Public export ────────────────────────────────────────────────────────────
// Signature is identical to the original — no call-site changes needed.

export function exportStatementsToXlsx(tables: FinancialStatementTable[], fileName: string) {
  const wb = XLSX.utils.book_new();

  // Cover / summary sheet
  XLSX.utils.book_append_sheet(wb, buildCoverSheet(tables, fileName), 'Summary');

  // One sheet per statement, containing full Consolidated + Standalone blocks.
  tables.forEach((table) => {
    const ws = buildFullStatementSheet(table);
    XLSX.utils.book_append_sheet(wb, ws, table.title.slice(0, 31));
  });

  XLSX.writeFile(wb, `${fileName}.xlsx`, {
    bookType:   'xlsx',
    type:       'binary',
    cellStyles: true,   // ← required for .s styles to be written into the file
  });
}
