export interface InvalidCrmDateLog {
  component: string;
  field: string;
  itemId?: string;
  rawValue: string;
  parsedTimestamp: number;
}

export function logInvalidCrmDate(entry: InvalidCrmDateLog): void {
  console.error('[crm:invalid-date]', entry);

  if (typeof window === 'undefined') {
    return;
  }

  void import('@/lib/diagnostics/client/buffer')
    .then(({ recordClientDiagnosticEvent }) => {
      recordClientDiagnosticEvent({
        kind: 'report',
        operation: 'crm:invalid-date',
        errorMessage: JSON.stringify(entry),
      });
    })
    .catch(() => undefined);
}
