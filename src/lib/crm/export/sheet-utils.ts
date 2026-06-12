import type { WorkSheet } from 'xlsx';
import * as XLSX from 'xlsx';

export function rowsToSheet(rows: unknown[][]): WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  applySheetFormatting(sheet, rows);
  return sheet;
}

function applySheetFormatting(sheet: WorkSheet, rows: unknown[][]) {
  if (rows.length === 0) {
    return;
  }

  const colCount = Math.max(...rows.map((row) => row.length));
  const widths = new Array<number>(colCount).fill(10);

  for (const row of rows) {
    row.forEach((cell, index) => {
      const length = String(cell ?? '').length;
      widths[index] = Math.min(Math.max(widths[index], length + 2), 60);
    });
  }

  sheet['!cols'] = widths.map((wch) => ({ wch }));
  sheet['!views'] = [
    {
      state: 'frozen',
      ySplit: 1,
      xSplit: 0,
      topLeftCell: 'A2',
      activeCell: 'A2',
    },
  ];
}

export function appendSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: unknown[][],
) {
  XLSX.utils.book_append_sheet(workbook, rowsToSheet(rows), name);
}
