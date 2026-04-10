import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "magicalive.com",
          },
        ],
        destination: "https://pinnaclemagic.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.magicalive.com",
          },
        ],
        destination: "https://pinnaclemagic.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
