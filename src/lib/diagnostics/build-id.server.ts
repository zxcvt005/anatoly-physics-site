import 'server-only';

export function getServerBuildId(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim() ||
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    'unknown'
  );
}

export function getServerDeploymentId(): string | undefined {
  return process.env.VERCEL_DEPLOYMENT_ID?.trim() || undefined;
}
