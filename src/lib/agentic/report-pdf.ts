import type { AgenticAnalysisReport } from '@/lib/agentic/personalized-engine';
import { formatCurrency, formatDateTime, formatPercent } from '@/lib/utils/format';

// ─── Layout constants ────────────────────────────────────────────────────────
const PAGE_MARGIN = 40;
const LINE_HEIGHT = 15;
const LABEL_COL_W = 148; // fixed label column width (fixes previous misalignment)
const SECTION_RADIUS = 6;

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  navy: [10, 23, 63] as [number, number, number],
  navyMid: [22, 42, 100] as [number, number, number],
  accent: [56, 189, 248] as [number, number, number],   // sky-400
  accentDark: [14, 116, 144] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  slate900: [15, 23, 42] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate100: [241, 245, 249] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  greenBg: [220, 252, 231] as [number, number, number],
  amber: [180, 83, 9] as [number, number, number],
  amberBg: [254, 243, 199] as [number, number, number],
  red: [185, 28, 28] as [number, number, number],
  redBg: [254, 226, 226] as [number, number, number],
  indigo: [67, 56, 202] as [number, number, number],
  indigoBg: [238, 242, 255] as [number, number, number],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function currencyForReport(report: AgenticAnalysisReport): 'INR' | 'USD' {
  return report.baseCurrency ?? report.userProfileSummary.baseCurrency ?? 'INR';
}

function recommendationPrimaryLabel(
  item: AgenticAnalysisReport['stockRecommendations'][number],
) {
  if (item.securityType === 'mutual_fund' || item.market === 'mf') {
    return item.name.trim() || item.displaySymbol.trim();
  }
  return item.displaySymbol.trim() || item.name.trim();
}

function recommendationBadgeLabel(
  item: AgenticAnalysisReport['stockRecommendations'][number],
) {
  if (item.securityType === 'mutual_fund' || item.market === 'mf') {
    const schemeCode = item.displaySymbol.trim();
    return schemeCode ? `AMFI ${schemeCode}` : item.name.trim();
  }
  return item.name.trim() || item.displaySymbol.trim();
}

function recColor(rec: string): {
  fg: [number, number, number];
  bg: [number, number, number];
} {
  const r = rec?.toUpperCase();
  if (r === 'BUY') return { fg: C.green, bg: C.greenBg };
  if (r === 'SELL') return { fg: C.red, bg: C.redBg };
  return { fg: C.amber, bg: C.amberBg };
}

/**
 * jsPDF's built-in Helvetica uses WinAnsi (ISO-8859-1 + Windows-1252).
 * Any character outside that set corrupts the glyph-metrics table for the
 * whole text run, causing every subsequent character to render with a wide
 * gap between it and its neighbours — which is exactly the "₹ 7 0 , 0 0 0"
 * spacing bug seen in the screenshots.
 *
 * This helper replaces the handful of Unicode codepoints we actually use
 * (₹, ⚠, ①–⑥, ·, —) with safe WinAnsi equivalents before any string
 * reaches jsPDF.
 */
function safe(text: string): string {
  return text
    .replace(/₹/g, 'Rs.')          // Rupee sign  → "Rs."
    .replace(/\u20B9/g, 'Rs.')      // Also U+20B9 (same glyph, different code point)
    .replace(/⚠\s*/g, '')          // Warning sign stripped (we prefix "NOTE:" in code)
    .replace(/[①②③④⑤⑥]/g, (c) =>
      String(c.codePointAt(0)! - 0x2460 + 1))  // ①→1 … ⑥→6
    .replace(/·/g, '-')             // Middle dot  → hyphen-minus
    .replace(/—/g, '-')             // Em dash     → hyphen-minus
    .replace(/[^\x00-\xFF]/g, '?'); // Anything else still outside → '?'
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function downloadPersonalizedReportPdf(report: AgenticAnalysisReport) {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();   // 595.28
  const pageH = doc.internal.pageSize.getHeight();  // 841.89
  const contentW = pageW - PAGE_MARGIN * 2;         // 515.28

  const moneyCurrency = currencyForReport(report);
  const primary = report.focusStock ?? report.stockRecommendations[0];

  let y = PAGE_MARGIN;
  let pageNum = 1;

  // ── Pagination helpers ────────────────────────────────────────────────────
  const stampFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.slate500);
    doc.text(
      'For informational purposes only. Not financial advice.',
      PAGE_MARGIN,
      pageH - 18,
    );
    doc.text(
      `Page ${pageNum}`,
      pageW - PAGE_MARGIN,
      pageH - 18,
      { align: 'right' },
    );
  };

  const newPage = () => {
    stampFooter();
    doc.addPage();
    pageNum += 1;
    y = PAGE_MARGIN + 8;
  };

  const ensureSpace = (needed = 32) => {
    if (y + needed > pageH - PAGE_MARGIN - 24) newPage();
  };

  // ── Typography helpers ────────────────────────────────────────────────────
  const setFont = (
    weight: 'normal' | 'bold' | 'italic',
    size: number,
    color: [number, number, number],
  ) => {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  /**
   * Writes wrapped body text and advances y.
   */
  const writeWrapped = (
    text: string,
    opts: {
      size?: number;
      color?: [number, number, number];
      indent?: number;
      lineSpacing?: number;
    } = {},
  ) => {
    const size = opts.size ?? 10;
    const color = opts.color ?? C.slate700;
    const indent = opts.indent ?? 0;
    const ls = opts.lineSpacing ?? size + 4;

    setFont('normal', size, color);
    const lines = doc.splitTextToSize(safe(text), contentW - indent);
    ensureSpace(lines.length * ls + 8);
    doc.text(lines, PAGE_MARGIN + indent, y);
    y += lines.length * ls + 6;
  };

  /**
   * Two-column label → value row with pixel-perfect alignment.
   * Label column is always LABEL_COL_W wide; value wraps in the remainder.
   */
  const writeLabelValue = (label: string, value: string) => {
    ensureSpace(26);
    const valueW = contentW - LABEL_COL_W - 8;

    setFont('bold', 9.5, C.slate500);
    doc.text(safe(label.toUpperCase()), PAGE_MARGIN, y);

    setFont('normal', 10, C.slate900);
    const lines = doc.splitTextToSize(safe(value), valueW);
    doc.text(lines, PAGE_MARGIN + LABEL_COL_W, y);

    y += Math.max(lines.length, 1) * LINE_HEIGHT + 2;
  };

  /**
   * Section header with left accent bar and background pill.
   */
  const writeSection = (title: string) => {
    ensureSpace(44);
    y += 8;
    // Background strip
    doc.setFillColor(...C.slate100);
    doc.roundedRect(PAGE_MARGIN, y - 14, contentW, 26, SECTION_RADIUS, SECTION_RADIUS, 'F');
    // Left accent bar
    doc.setFillColor(...C.accent);
    doc.roundedRect(PAGE_MARGIN, y - 14, 4, 26, 2, 2, 'F');
    // Title text
    setFont('bold', 11, C.navy);
    doc.text(title, PAGE_MARGIN + 14, y + 2);
    y += 20;
  };

  /**
   * Horizontal rule.
   */
  const writeRule = (opacity = 0.35) => {
    doc.setDrawColor(...C.slate200);
    doc.setLineWidth(0.5);
    doc.line(PAGE_MARGIN, y, PAGE_MARGIN + contentW, y);
    y += 6;
  };

  /**
   * Bullet list with hanging indent.
   */
  const writeBulletList = (items: string[], color: [number, number, number] = C.slate700) => {
    for (const item of items) {
      ensureSpace(22);
      setFont('normal', 10, color);
      const lines = doc.splitTextToSize(safe(item), contentW - 16);
      // Bullet
      doc.setFillColor(...C.accent);
      doc.circle(PAGE_MARGIN + 4, y - 3, 2, 'F');
      doc.text(lines, PAGE_MARGIN + 14, y);
      y += lines.length * LINE_HEIGHT + 3;
    }
  };

  /**
   * Score pill: a small rounded badge showing a label + numeric score.
   * pillW is passed in so callers can size all four pills to fill contentW
   * exactly — hardcoding 108 caused the last pill to clip at the right margin.
   */
  const writeScorePill = (label: string, score: number, x: number, pillY: number, pillW: number) => {
    const pillH = 42;
    const pct = Math.min(Math.max(score, 0), 100) / 100;
    // Card background
    doc.setFillColor(...C.slate100);
    doc.roundedRect(x, pillY, pillW, pillH, 6, 6, 'F');
    // Progress bar track
    doc.setFillColor(...C.slate200);
    doc.roundedRect(x + 8, pillY + 30, pillW - 16, 5, 2, 2, 'F');
    // Progress bar fill (color based on score)
    const barColor: [number, number, number] =
      pct >= 0.75 ? C.green : pct >= 0.5 ? C.amber : C.red;
    doc.setFillColor(...barColor);
    doc.roundedRect(x + 8, pillY + 30, (pillW - 16) * pct, 5, 2, 2, 'F');
    // Score number
    setFont('bold', 16, C.navy);
    doc.text(`${score}`, x + pillW / 2, pillY + 22, { align: 'center' });
    // Label
    setFont('normal', 7.5, C.slate500);
    doc.text(safe(label.toUpperCase()), x + pillW / 2, pillY + 11, { align: 'center' });
  };

  /**
   * Recommendation badge (BUY / HOLD / SELL).
   */
  const writeRecBadge = (rec: string, bx: number, by: number) => {
    const { fg, bg } = recColor(rec);
    const w = 60;
    const h = 20;
    doc.setFillColor(...bg);
    doc.roundedRect(bx, by - 14, w, h, 5, 5, 'F');
    setFont('bold', 10, fg);
    doc.text(rec.toUpperCase(), bx + w / 2, by - 1, { align: 'center' });
  };

  // ── ① Cover / Hero section ────────────────────────────────────────────────
  // Dark gradient header block
  const heroH = 148;
  doc.setFillColor(...C.navy);
  doc.roundedRect(PAGE_MARGIN, y, contentW, heroH, 14, 14, 'F');

  // Accent stripe across top of hero
  doc.setFillColor(...C.accent);
  doc.roundedRect(PAGE_MARGIN, y, contentW, 5, 0, 0, 'F');

  // Title
  setFont('bold', 18, C.white);
  doc.text('Personalized Stock Intelligence Report', PAGE_MARGIN + 20, y + 34);

  // Headline (recommendation summary)
  setFont('bold', 13, C.accent);
  doc.text(safe(report.finalRecommendation.headline), PAGE_MARGIN + 20, y + 58);

  // Key reason (wrapped)
  setFont('normal', 9.5, [190, 220, 255]);
  const heroLines = doc.splitTextToSize(safe(report.finalRecommendation.keyReason), contentW - 40);
  doc.text(heroLines, PAGE_MARGIN + 20, y + 78);

  // Generated timestamp
  setFont('normal', 8, C.slate500);
  doc.text(safe(`Generated ${formatDateTime(report.generatedAt)}`), PAGE_MARGIN + 20, y + heroH - 12);

  y += heroH + 20;

  // ── ② User Profile Summary ────────────────────────────────────────────────
  writeSection('User Profile Summary');
  y += 6;
  writeLabelValue('Life stage', report.userProfileSummary.lifeStage);
  writeLabelValue('Market scope', report.userProfileSummary.marketScope.toUpperCase());
  writeLabelValue('Goal', report.userProfileSummary.investmentGoal.replace(/_/g, ' '));
  writeLabelValue('Horizon', report.userProfileSummary.investmentHorizon);
  writeLabelValue('Risk preference', report.userProfileSummary.riskPreference);
  writeLabelValue('Liquidity need', report.userProfileSummary.liquidityNeed);
  writeLabelValue(
    'Monthly income',
    formatCurrency(report.userProfileSummary.monthlyIncome, moneyCurrency, false),
  );
  writeLabelValue(
    'Monthly spend',
    formatCurrency(report.userProfileSummary.monthlyCoreSpend, moneyCurrency, false),
  );
  writeLabelValue(
    'FX context',
    `USD/INR ${
      Number.isFinite(report.fxContext.usdInrRate) && report.fxContext.usdInrRate > 0
        ? report.fxContext.usdInrRate.toFixed(4)
        : 'Unavailable'
    } (${report.fxContext.stale ? 'cached reference' : 'live cache'} - ${report.fxContext.source})`,
  );
  y += 4;

  // ── ③ Household Financial Score ───────────────────────────────────────────
  writeSection('Household Financial Score');
  y += 6;
  writeLabelValue(
    'Investable surplus',
    `${formatCurrency(report.finance.investableSurplusMonthly, moneyCurrency, false)}/month`,
  );
  writeLabelValue(
    'Debt burden',
    `${formatPercent(report.finance.debtBurdenRatioPct)} (${report.finance.debtBurdenFlag})`,
  );
  writeLabelValue('Net worth', formatCurrency(report.finance.netWorth, moneyCurrency, false));
  writeLabelValue(
    'Emergency fund gap',
    formatCurrency(report.finance.emergencyFundShortfallValue, moneyCurrency, false),
  );
  writeLabelValue(
    'Risk profile',
    `${report.finance.riskProfileLabel} (${report.finance.riskProfileScore}/100)`,
  );

  // Tinted callout box for portfolio gap summary
  ensureSpace(52);
  y += 4;
  const gapLines = doc.splitTextToSize(safe(report.finance.portfolioGapSummary), contentW - 24);
  const gapBoxH = gapLines.length * 13 + 18;
  doc.setFillColor(...C.indigoBg);
  doc.roundedRect(PAGE_MARGIN, y, contentW, gapBoxH, 6, 6, 'F');
  doc.setFillColor(...C.indigo);
  doc.roundedRect(PAGE_MARGIN, y, 4, gapBoxH, 2, 2, 'F');
  setFont('normal', 9.5, C.indigo);
  doc.text(gapLines, PAGE_MARGIN + 14, y + 13);
  y += gapBoxH + 12;

  // ── ④ Primary Recommendation ──────────────────────────────────────────────
  if (primary) {
    writeSection('Primary Recommendation');
    y += 6;

    // Stock name row + BUY badge inline
    ensureSpace(30);
    setFont('bold', 13, C.navy);
    doc.text(
      `${recommendationPrimaryLabel(primary)}`,
      PAGE_MARGIN,
      y,
    );
    // Badge
    writeRecBadge(primary.recommendation, PAGE_MARGIN + contentW - 68, y);

    setFont('normal', 10, C.slate500);
    doc.text(recommendationBadgeLabel(primary), PAGE_MARGIN, y + 14);
    y += 28;
    writeRule();

    writeLabelValue('Personalized fit', `${primary.scores.personalizedFit}/100`);
    writeLabelValue(
      'Suggested allocation',
      `${formatCurrency(primary.allocation.baseAmountMonthly, primary.allocation.baseCurrency, false)}/month${
        primary.allocation.baseCurrency !== primary.allocation.securityCurrency
          ? ` (${formatCurrency(primary.allocation.securityAmountMonthly, primary.allocation.securityCurrency, false)}/month)`
          : ''
      }`,
    );
    writeLabelValue('Holding period', primary.expectedHoldingPeriod);
    writeLabelValue(
      'DCF view',
      typeof primary.dcf.marginOfSafetyPct === 'number'
        ? `${primary.dcf.valuationLabel} - ${formatPercent(primary.dcf.marginOfSafetyPct)} margin of safety`
        : primary.dcf.valuationLabel,
    );

    // Score pills row — width is computed dynamically so all four tiles fit
    // flush within contentW with equal gaps and no clipping.
    ensureSpace(70);
    y += 8;
    const pillLabels: Array<{ label: string; score: number }> = [
      { label: 'Fundamentals', score: primary.scores.fundamentals },
      { label: 'Technical', score: primary.scores.technical },
      { label: 'Sentiment', score: primary.scores.sentiment },
      { label: 'Risk Fit', score: primary.scores.riskCompatibility },
    ];
    const PILL_GAP = 10;
    const PILL_COUNT = pillLabels.length;
    const pillW = (contentW - (PILL_COUNT - 1) * PILL_GAP) / PILL_COUNT;
    pillLabels.forEach(({ label, score }, i) => {
      writeScorePill(label, score, PAGE_MARGIN + i * (pillW + PILL_GAP), y, pillW);
    });
    y += 54;

    // Tax note callout box.
    // IMPORTANT: split width must subtract both the left indent (14pt) AND a
    // matching right gutter (14pt) so the last word never clips the box edge.
    // ensureSpace is called AFTER computing the real box height so we never
    // start drawing a box that would overflow the current page.
    {
      const TAX_FONT_SIZE = 9;
      const TAX_LINE_H = TAX_FONT_SIZE + 4;   // 13 pt — matches font metrics
      const TAX_PAD_TOP = 13;
      const TAX_PAD_BOT = 11;
      const TAX_INDENT = 14;                  // left indent (after the amber bar)
      const TAX_TEXT_W = contentW - TAX_INDENT - 14; // subtract indent + right gutter

      setFont('normal', TAX_FONT_SIZE, C.amber); // set font BEFORE splitTextToSize
      const taxText = safe(`NOTE:  ${primary.taxImpact.note}`);
      const taxLines = doc.splitTextToSize(taxText, TAX_TEXT_W);
      const taxH = taxLines.length * TAX_LINE_H + TAX_PAD_TOP + TAX_PAD_BOT;

      ensureSpace(taxH + 8); // now we know the actual height before drawing

      doc.setFillColor(...C.amberBg);
      doc.roundedRect(PAGE_MARGIN, y, contentW, taxH, 6, 6, 'F');
      doc.setFillColor(...C.amber);
      doc.roundedRect(PAGE_MARGIN, y, 4, taxH, 2, 2, 'F');
      setFont('normal', TAX_FONT_SIZE, C.amber);
      doc.text(taxLines, PAGE_MARGIN + TAX_INDENT, y + TAX_PAD_TOP);
      y += taxH + 12;
    }

    // Why It Fits
    writeSection('Why It Fits');
    y += 6;
    writeBulletList(primary.supportPoints, C.slate700);

    // Key Cautions
    writeSection('Key Cautions');
    y += 6;
    writeBulletList(primary.cautionPoints, [120, 50, 0]);
  }

  // ── ⑤ Alternative Ideas ───────────────────────────────────────────────────
  const alternatives = report.stockRecommendations
    .filter((s) => !primary || s.symbol !== primary.symbol)
    .slice(0, 3);

  if (alternatives.length) {
    writeSection('Alternative Ideas');
    y += 6;

    for (const stock of alternatives) {
      const altLines = doc.splitTextToSize(safe(stock.keyReason), contentW - 100);
      const cardH = Math.max(56, altLines.length * 13 + 36);
      ensureSpace(cardH + 10);

      // Card background
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.slate200);
      doc.setLineWidth(0.75);
      doc.roundedRect(PAGE_MARGIN, y, contentW, cardH, 8, 8, 'FD');

      // Stock name
      setFont('bold', 11, C.navy);
      doc.text(recommendationPrimaryLabel(stock), PAGE_MARGIN + 14, y + 18);

      // Fit score chip
      const fitLabel = `${stock.scores.personalizedFit}/100`;
      setFont('bold', 9, C.indigo);
      doc.setFillColor(...C.indigoBg);
      doc.roundedRect(PAGE_MARGIN + contentW - 72, y + 6, 58, 18, 5, 5, 'F');
      doc.text(fitLabel, PAGE_MARGIN + contentW - 43, y + 18, { align: 'center' });

      // Rec badge
      writeRecBadge(stock.recommendation, PAGE_MARGIN + contentW - 140, y + 6);

      // Key reason
      setFont('normal', 9.5, C.slate700);
      doc.text(altLines, PAGE_MARGIN + 14, y + 34);

      y += cardH + 10;
    }
  }

  // ── ⑥ Model Notes ─────────────────────────────────────────────────────────
  writeSection('Model Notes');
  y += 6;
  writeBulletList(report.notes, C.slate500);

  // ── Stamp footer on last page ──────────────────────────────────────────────
  stampFooter();

  const safeDate = new Date().toISOString().slice(0, 10);
  doc.save(`agentic-wealth-report-${safeDate}.pdf`);
}