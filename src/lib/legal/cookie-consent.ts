export const COOKIE_CONSENT_STORAGE_KEY = 'legal-cookie-consent-v1';

export interface CookieConsentRecord {
  acceptedAt: string;
  version: string;
}

export const COOKIE_CONSENT_VERSION = '2026-08-01';

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CookieConsentRecord;
    if (!parsed.acceptedAt || parsed.version !== COOKIE_CONSENT_VERSION) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeCookieConsent(): CookieConsentRecord {
  const record: CookieConsentRecord = {
    acceptedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };

  window.localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify(record),
  );

  return record;
}
