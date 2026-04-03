import type { AgenticAnalysisReport } from '@/lib/agentic/personalized-engine';
import { formatCurrency, formatDateTime, formatPercent } from '@/lib/utils/format';

const PAGE_MARGIN = 44;
const LINE_HEIGHT = 15;

function currencyForReport(report: AgenticAnalysisReport): 'INR' | 'USD' {
  return report.baseCurrency ?? report.userProfileSummary.baseCurrency ?? 'INR';
}

export async function downloadPersonalizedReportPdf(report: AgenticAnalysisReport) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const moneyCurrency = currencyForReport(report);
  const primary = report.focusStock ?? report.stockRecommendations[0];
  let y = PAGE_MARGIN;

  const ensureSpace = (needed = 32) => {
    if (y + needed <= pageHeight - PAGE_MARGIN) return;
    doc.addPage();
    y = PAGE_MARGIN;
  };

  const writeWrapped = (text: string, options?: { size?: number; color?: [number, number, number]; indent?: number }) => {
    const size = options?.size ?? 11;
    const color = options?.color ?? [39, 52, 74];
    const indent = options?.indent ?? 0;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    ensureSpace(lines.length * (size + 3) + 10);
    doc.text(lines, PAGE_MARGIN + indent, y);
    y += lines.length * (size + 3) + 6;
  };

  const writeLabelValue = (label: string, value: string) => {
    ensureSpace(32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(label, PAGE_MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(value, contentWidth - 120);
    doc.text(lines, PAGE_MARGIN + 120, y);
    y += Math.max(1, lines.length) * LINE_HEIGHT + 4;
  };

  const writeSection = (title: string) => {
    ensureSpace(36);
    if (y > PAGE_MARGIN + 4) y += 6;
    doc.setDrawColor(186, 230, 253);
    doc.setFillColor(236, 254, 255);
    doc.roundedRect(PAGE_MARGIN, y - 18, contentWidth, 24, 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(8, 47, 73);
    doc.text(title, PAGE_MARGIN + 12, y - 2);
    y += 18;
  };

  const writeBulletList = (items: string[]) => {
    for (const item of items) {
      ensureSpace(24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(item, contentWidth - 16);
      doc.text('\u2022', PAGE_MARGIN, y);
      doc.text(lines, PAGE_MARGIN + 12, y);
      y += lines.length * LINE_HEIGHT + 4;
    }
  };

  doc.setFillColor(10, 23, 63);
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, 122, 18, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(244, 248, 255);
  doc.text('Personalized Stock Intelligence Report', PAGE_MARGIN + 18, y + 30);
  doc.setFontSize(13);
  doc.setTextColor(125, 211, 252);
  doc.text(report.finalRecommendation.headline, PAGE_MARGIN + 18, y + 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(208, 221, 255);
  const heroLines = doc.splitTextToSize(report.finalRecommendation.keyReason, contentWidth - 36);
  doc.text(heroLines, PAGE_MARGIN + 18, y + 78);
  doc.text(`Generated ${formatDateTime(report.generatedAt)}`, PAGE_MARGIN + 18, y + 106);
  y += 144;

  writeSection('User Profile Summary');
  writeLabelValue('Life stage', report.userProfileSummary.lifeStage);
  writeLabelValue('Market scope', report.userProfileSummary.marketScope.toUpperCase());
  writeLabelValue('Goal', report.userProfileSummary.investmentGoal.replace(/_/g, ' '));
  writeLabelValue('Horizon', report.userProfileSummary.investmentHorizon);
  writeLabelValue('Risk preference', report.userProfileSummary.riskPreference);
  writeLabelValue('Liquidity need', report.userProfileSummary.liquidityNeed);
  writeLabelValue('Monthly income', formatCurrency(report.userProfileSummary.monthlyIncome, moneyCurrency, false));
  writeLabelValue('Monthly spend', formatCurrency(report.userProfileSummary.monthlyCoreSpend, moneyCurrency, false));
  writeLabelValue(
    'FX context',
    `USD/INR ${Number.isFinite(report.fxContext.usdInrRate) && report.fxContext.usdInrRate > 0 ? report.fxContext.usdInrRate.toFixed(4) : 'Unavailable'} (${report.fxContext.stale ? 'cached reference' : 'live cache'} • ${report.fxContext.source})`,
  );

  writeSection('Household Financial Score');
  writeLabelValue('Investable surplus', `${formatCurrency(report.finance.investableSurplusMonthly, moneyCurrency, false)}/month`);
  writeLabelValue('Debt burden', `${formatPercent(report.finance.debtBurdenRatioPct)} (${report.finance.debtBurdenFlag})`);
  writeLabelValue('Net worth', formatCurrency(report.finance.netWorth, moneyCurrency, false));
  writeLabelValue('Emergency fund gap', formatCurrency(report.finance.emergencyFundShortfallValue, moneyCurrency, false));
  writeLabelValue('Risk profile', `${report.finance.riskProfileLabel} (${report.finance.riskProfileScore}/100)`);
  writeWrapped(report.finance.portfolioGapSummary, { color: [8, 47, 73] });

  if (primary) {
    writeSection('Primary Recommendation');
    writeLabelValue('Stock', `${primary.displaySymbol} (${primary.name})`);
    writeLabelValue('Recommendation', primary.recommendation);
    writeLabelValue('Personalized fit', `${primary.scores.personalizedFit}/100`);
    writeLabelValue(
      'Suggested allocation (base)',
      `${formatCurrency(primary.allocation.baseAmountMonthly, primary.allocation.baseCurrency, false)}/month`,
    );
    if (primary.allocation.baseCurrency !== primary.allocation.securityCurrency) {
      writeLabelValue(
        'Suggested allocation (security)',
        `${formatCurrency(primary.allocation.securityAmountMonthly, primary.allocation.securityCurrency, false)}/month`,
      );
    }
    writeLabelValue('Holding period', primary.expectedHoldingPeriod);
    writeLabelValue(
      'DCF view',
      typeof primary.dcf.marginOfSafetyPct === 'number'
        ? `${primary.dcf.valuationLabel} (${formatPercent(primary.dcf.marginOfSafetyPct)} margin of safety)`
        : primary.dcf.valuationLabel,
    );
    writeLabelValue(
      'Core scores',
      `Fundamentals ${primary.scores.fundamentals}, Technical ${primary.scores.technical}, Sentiment ${primary.scores.sentiment}, Risk fit ${primary.scores.riskCompatibility}`,
    );
    writeWrapped(primary.taxImpact.note, { color: [71, 85, 105] });

    writeSection('Why It Fits');
    writeBulletList(primary.supportPoints);

    writeSection('Key Cautions');
    writeBulletList(primary.cautionPoints);
  }

  const alternatives = report.stockRecommendations
    .filter((stock) => !primary || stock.symbol !== primary.symbol)
    .slice(0, 3);

  if (alternatives.length) {
    writeSection('Alternative Ideas');
    for (const stock of alternatives) {
      ensureSpace(60);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(PAGE_MARGIN, y - 4, contentWidth, 48, 12, 12, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${stock.displaySymbol} • ${stock.recommendation} • ${stock.scores.personalizedFit}/100`, PAGE_MARGIN + 12, y + 12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(stock.keyReason, contentWidth - 24);
      doc.text(lines, PAGE_MARGIN + 12, y + 28);
      y += 60;
    }
  }

  writeSection('Model Notes');
  writeBulletList(report.notes);

  const safeDate = new Date().toISOString().slice(0, 10);
  doc.save(`agentic-wealth-report-${safeDate}.pdf`);
}
