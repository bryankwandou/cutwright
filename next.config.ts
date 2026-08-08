import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // WebCodecs + SharedArrayBuffer-adjacent APIs behave best under cross-origin
  // isolation. Nothing here loads third-party frames, so this costs us nothing.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
