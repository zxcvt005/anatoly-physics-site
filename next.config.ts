import type { NextConfig } from "next";

const appBuildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
  "local-dev";

const appDeploymentId = process.env.VERCEL_DEPLOYMENT_ID?.trim() || undefined;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: appBuildId,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA:
      process.env.VERCEL_GIT_COMMIT_SHA?.trim() || appBuildId,
    ...(appDeploymentId
      ? { NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID: appDeploymentId }
      : {}),
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-App-Build",
            value: appBuildId,
          },
          ...(appDeploymentId
            ? [
                {
                  key: "X-App-Deployment",
                  value: appDeploymentId,
                },
              ]
            : []),
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/documents/oferta.pdf",
        destination: "/oferta.pdf",
      },
    ];
  },
};

export default nextConfig;
