/** Safe build identifier exposed to the client bundle at build time. */
export function getPublicBuildId(): string {
  return (
    process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    'unknown'
  );
}

export function getPublicDeploymentId(): string | undefined {
  const value = process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID?.trim();
  return value || undefined;
}
