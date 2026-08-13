import { recordClientDiagnosticEvent } from '@/lib/diagnostics/client/buffer';
import { mapTestSaveValidationError } from '@/lib/tests/editor-user-errors';
import { diagnosticFetch } from '@/lib/diagnostics/client/instrumented-fetch';

type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

function formatCrmApiError(message: string, status: number): string {
  if (status === 401) {
    return 'Сессия истекла. Обновите страницу и войдите снова.';
  }
  if (status === 403) {
    return 'Недостаточно прав для этого действия.';
  }
  if (status === 503) {
    return 'База данных не настроена.';
  }

  return mapTestSaveValidationError(message);
}

async function parseCrmApiResponse<T>(
  response: Response,
  diagnosticOperation: string,
): Promise<RepositoryResult<T>> {
  let body: RepositoryResult<T>;

  try {
    body = (await response.json()) as RepositoryResult<T>;
    recordClientDiagnosticEvent({
      kind: 'fetch',
      operation: `${diagnosticOperation}:json-parse`,
      httpStatus: response.status,
      jsonParseSuccess: true,
      contentType: response.headers.get('content-type') ?? undefined,
    });
  } catch (error) {
    recordClientDiagnosticEvent({
      kind: 'fetch',
      operation: `${diagnosticOperation}:json-parse-failed`,
      httpStatus: response.status,
      jsonParseSuccess: false,
      errorName: error instanceof Error ? error.name : 'Error',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      ok: false,
      error: formatCrmApiError(
        response.ok ? 'Invalid server response' : `Request failed (${response.status})`,
        response.status,
      ),
    };
  }

  if (!response.ok && body.ok !== false) {
    return {
      ok: false,
      error: formatCrmApiError(`Request failed (${response.status})`, response.status),
    };
  }

  if (!body.ok && 'error' in body && typeof body.error === 'string') {
    return {
      ...body,
      error: formatCrmApiError(body.error, response.status),
    };
  }

  return body;
}

export async function crmApiGet<T>(path: string): Promise<RepositoryResult<T>> {
  const operation = `crmApiGet:${path}`;
  try {
    const response = await diagnosticFetch(path, {
      method: 'GET',
      credentials: 'same-origin',
      diagnosticOperation: operation,
    });

    return parseCrmApiResponse<T>(response, operation);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function crmApiPost<T>(
  path: string,
  payload?: unknown,
): Promise<RepositoryResult<T>> {
  const operation = `crmApiPost:${path}`;
  try {
    const response = await diagnosticFetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      diagnosticOperation: operation,
    });

    return parseCrmApiResponse<T>(response, operation);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function crmApiPut<T>(
  path: string,
  payload: unknown,
): Promise<RepositoryResult<T>> {
  const operation = `crmApiPut:${path}`;
  try {
    const response = await diagnosticFetch(path, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      diagnosticOperation: operation,
    });

    return parseCrmApiResponse<T>(response, operation);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function crmApiPatch<T>(
  path: string,
  payload: unknown,
): Promise<RepositoryResult<T>> {
  const operation = `crmApiPatch:${path}`;
  try {
    const response = await diagnosticFetch(path, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      diagnosticOperation: operation,
    });

    return parseCrmApiResponse<T>(response, operation);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function crmApiDelete<T>(
  path: string,
): Promise<RepositoryResult<T>> {
  const operation = `crmApiDelete:${path}`;
  try {
    const response = await diagnosticFetch(path, {
      method: 'DELETE',
      credentials: 'same-origin',
      diagnosticOperation: operation,
    });

    return parseCrmApiResponse<T>(response, operation);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
