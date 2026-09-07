/**
 * Live HTTP chain against the local Next server.
 * Reads CRM passwords from env files; never prints them.
 */
import {
  bootstrapIntegrationProcessEnv,
} from './lib/supabase-integration-env';

const BASE = process.env.CRM_VERIFY_BASE_URL ?? 'http://127.0.0.1:3000';

function cookieFromResponse(response: Response, name: string): string | null {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [response.headers.get('set-cookie') ?? ''];

  for (const header of setCookies) {
    const match = header.match(new RegExp(`(?:^|,)\\s*${name}=([^;]+)`));
    if (match) return `${name}=${match[1]}`;
  }

  return null;
}

async function login(role: 'admin' | 'assistant', password: string | undefined) {
  if (!password) {
    return { ok: false as const, error: `${role} password missing` };
  }

  const response = await fetch(`${BASE}/api/auth/crm-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, role }),
  });
  const body = (await response.json()) as { ok?: boolean; error?: string };
  if (!response.ok || !body.ok) {
    return { ok: false as const, error: body.error ?? `login ${response.status}` };
  }

  const cookieName =
    role === 'admin' ? 'crm_admin_access' : 'crm_assistant_access';
  const cookie = cookieFromResponse(response, cookieName);
  if (!cookie) {
    return { ok: false as const, error: 'login cookie missing' };
  }

  return { ok: true as const, cookie };
}

async function crmJson<T>(
  cookie: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: T }> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      cookie,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
  return {
    status: response.status,
    body: (await response.json()) as T,
  };
}

async function run() {
  const env = bootstrapIntegrationProcessEnv();
  const adminLogin = await login('admin', env.ADMIN_ACCESS_PASSWORD);
  if (!adminLogin.ok) {
    console.error('admin login failed:', adminLogin.error);
    process.exit(1);
  }

  type Repo<T> = { ok: true; data: T } | { ok: false; error: string };
  const stamp = Date.now();

  const createTopic = await crmJson<Repo<{ id: string; title: string }>>(
    adminLogin.cookie,
    '/api/crm/tests/topics',
    {
      method: 'POST',
      body: JSON.stringify({ title: `HTTP verify topic ${stamp}`, sectionId: null }),
    },
  );
  console.log('POST /api/crm/tests/topics', createTopic.status, createTopic.body.ok);
  if (!createTopic.body.ok) {
    console.error(createTopic.body.error);
    process.exit(1);
  }

  const topicId = createTopic.body.data.id;
  const save = await crmJson<Repo<{ test: { id: string }; questions: unknown[] }>>(
    adminLogin.cookie,
    `/api/crm/tests/topics/${topicId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        test: {
          title: `HTTP verify test ${stamp}`,
          isPublished: true,
          questions: [
            {
              sortOrder: 0,
              questionType: 'single_choice',
              promptText: '2+2?',
              maxPoints: 1,
              config: {},
              options: [
                { sortOrder: 0, labelText: '3', isCorrect: false },
                { sortOrder: 1, labelText: '4', isCorrect: true },
              ],
            },
          ],
        },
      }),
    },
  );
  console.log('PUT create test', save.status, save.body.ok);
  if (!save.body.ok) {
    console.error(save.body.error);
    process.exit(1);
  }

  const reload = await crmJson<Repo<{ questions: Array<{ promptText: string }> }>>(
    adminLogin.cookie,
    `/api/crm/tests/topics/${topicId}`,
  );
  console.log('GET test', reload.status, reload.body.ok);
  if (!reload.body.ok) {
    console.error(reload.body.error);
    process.exit(1);
  }

  const edit = await crmJson<Repo<{ questions: Array<{ promptText: string }> }>>(
    adminLogin.cookie,
    `/api/crm/tests/topics/${topicId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        test: {
          title: `HTTP verify test ${stamp} edited`,
          isPublished: true,
          questions: [
            {
              sortOrder: 0,
              questionType: 'numeric',
              promptText: '3+3?',
              maxPoints: 1,
              config: { correctValue: 6, tolerance: 0 },
              options: [],
            },
          ],
        },
      }),
    },
  );
  console.log('PUT edit test', edit.status, edit.body.ok);
  if (!edit.body.ok) {
    console.error(edit.body.error);
    process.exit(1);
  }

  const reloadEdit = await crmJson<
    Repo<{ test: { title: string }; questions: Array<{ promptText: string }> }>
  >(adminLogin.cookie, `/api/crm/tests/topics/${topicId}`);
  const prompt = reloadEdit.body.ok
    ? reloadEdit.body.data.questions[0]?.promptText
    : undefined;
  console.log('GET after edit prompt:', prompt);

  await crmJson(adminLogin.cookie, `/api/crm/tests/topics/${topicId}/test`, {
    method: 'DELETE',
  });
  await crmJson(adminLogin.cookie, `/api/crm/tests/topics/${topicId}`, {
    method: 'DELETE',
  });

  const lessons = await crmJson<Repo<unknown[]>>(
    adminLogin.cookie,
    '/api/crm/lessons',
  );
  const slots = await crmJson<Repo<unknown[]>>(
    adminLogin.cookie,
    '/api/crm/schedule-slots',
  );
  console.log(
    'GET lessons',
    lessons.status,
    lessons.body.ok,
    lessons.body.ok ? `count=${lessons.body.data.length}` : lessons.body.error,
  );
  console.log(
    'GET slots',
    slots.status,
    slots.body.ok,
    slots.body.ok ? `count=${slots.body.data.length}` : slots.body.error,
  );

  const assistantLogin = await login(
    'assistant',
    env.ASSISTANT_ACCESS_PASSWORD,
  );
  if (assistantLogin.ok) {
    const assistantTopics = await crmJson<Repo<unknown[]>>(
      assistantLogin.cookie,
      '/api/crm/tests/topics',
    );
    console.log(
      'assistant GET topics',
      assistantTopics.status,
      assistantTopics.body.ok,
    );
  } else {
    console.log('assistant login skipped:', assistantLogin.error);
  }

  if (prompt !== '3+3?') {
    console.error('edited prompt did not persist');
    process.exit(1);
  }

  console.log('verify-crm-http-chain: PASSED');
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
