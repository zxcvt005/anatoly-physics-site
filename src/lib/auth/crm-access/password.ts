export function getAdminAccessPassword(): string | undefined {
  const value = process.env.ADMIN_ACCESS_PASSWORD?.trim();
  return value || undefined;
}

export function getAssistantAccessPassword(): string | undefined {
  const value = process.env.ASSISTANT_ACCESS_PASSWORD?.trim();
  return value || undefined;
}
