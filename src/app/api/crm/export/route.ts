import { NextResponse } from 'next/server';
import { assertSupabaseConfiguredOnServer } from '@/lib/crm/api/route-utils';
import {
  buildCrmExportWorkbook,
  getCrmExportFilename,
  getRequestOrigin,
} from '@/lib/crm/export/build-workbook';

export async function GET(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const origin = getRequestOrigin(request);
  const result = await buildCrmExportWorkbook(origin);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const filename = getCrmExportFilename();

  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
