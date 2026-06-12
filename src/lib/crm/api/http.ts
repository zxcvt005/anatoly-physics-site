type RepositoryResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function parseCrmApiResponse<T>(
  response: Response,
): Promise<RepositoryResult<T>> {
  let body: RepositoryResult<T>;

  try {
    body = (await response.json()) as RepositoryResult<T>;
  } catch {
    return {
      ok: false,
      error: response.ok
        ? 'Invalid server response'
        : `Request failed (${response.status})`,
    };
  }

  if (!response.ok && body.ok !== false) {
    return {
      ok: false,
      error: `Request failed (${response.status})`,
    };
  }

  return body;
}

export async function crmApiGet<T>(path: string): Promise<RepositoryResult<T>> {
  try {
    const response = await fetch(path, {
      method: 'GET',
      credentials: 'same-origin',
    });

    return parseCrmApiResponse<T>(response);
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
  try {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });

    return parseCrmApiResponse<T>(response);
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
  try {
    const response = await fetch(path, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return parseCrmApiResponse<T>(response);
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
  try {
    const response = await fetch(path, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return parseCrmApiResponse<T>(response);
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
  try {
    const response = await fetch(path, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    return parseCrmApiResponse<T>(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
