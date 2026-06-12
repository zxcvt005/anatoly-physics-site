export const CRM_ADMIN_ACCESS_COOKIE_NAME = 'crm_admin_access';

export const CRM_ASSISTANT_ACCESS_COOKIE_NAME = 'crm_assistant_access';

/** 30 days */
export const CRM_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const CRM_ADMIN_SESSION_MARKER = 'crm-admin-session-v1';

export const CRM_ASSISTANT_SESSION_MARKER = 'crm-assistant-session-v1';

export const CRM_LOGIN_PATH = '/crm/login';

export type CrmAccessRole = 'admin' | 'assistant';

/** @deprecated Use CRM_ADMIN_ACCESS_COOKIE_NAME */
export const CRM_ACCESS_COOKIE_NAME = CRM_ADMIN_ACCESS_COOKIE_NAME;

/** @deprecated Use CRM_ADMIN_SESSION_MARKER */
export const CRM_ACCESS_SESSION_MARKER = CRM_ADMIN_SESSION_MARKER;
