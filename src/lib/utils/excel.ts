import * as XLSX from 'xlsx';
import type { FinancialStatementTable } from '@/types';

export function exportStatementsToXlsx(tables: FinancialStatementTable[], fileName: string) {
  const wb = XLSX.utils.book_new();
  tables.forEach((table) => {
    const rows = table.rows.map((row) => ({ label: row.label, ...row.valuesByYear }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, table.title.slice(0, 31));
  });
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
