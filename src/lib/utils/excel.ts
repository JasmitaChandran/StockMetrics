import * as XLSX from 'xlsx';
import type { FinancialStatementTable } from '@/types';

function rowsToSheet(rows: FinancialStatementTable['rows']) {
  return rows.map((row) => ({ label: row.label, ...row.valuesByYear }));
}

export function exportStatementsToXlsx(tables: FinancialStatementTable[], fileName: string) {
  const wb = XLSX.utils.book_new();
  tables.forEach((table) => {
    const consolidated = table.viewData?.consolidated;
    const standalone = table.viewData?.standalone;

    if (consolidated || standalone) {
      if (consolidated) {
        const ws = XLSX.utils.json_to_sheet(rowsToSheet(consolidated.rows));
        XLSX.utils.book_append_sheet(wb, ws, `${table.title} Cons`.slice(0, 31));
      }
      if (standalone) {
        const ws = XLSX.utils.json_to_sheet(rowsToSheet(standalone.rows));
        XLSX.utils.book_append_sheet(wb, ws, `${table.title} Stand`.slice(0, 31));
      }
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rowsToSheet(table.rows));
    XLSX.utils.book_append_sheet(wb, ws, table.title.slice(0, 31));
  });
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
