'use client';

import { Download } from 'lucide-react';

export function AdminExportReportButton() {
  return (
    <a
      href="/api/crm/export"
      className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20 hover:text-white"
    >
      <Download className="h-4 w-4" aria-hidden />
      Скачать отчёт
    </a>
  );
}
