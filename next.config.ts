import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
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
