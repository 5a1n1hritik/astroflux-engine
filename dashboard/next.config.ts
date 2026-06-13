import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize the telemetry or features on a builds
  reactStrictMode: true,
  
  // Turbopack ko explicitly batana ki hum rules native custom layers par bypass kar rahe hain
  turbopack: {},

  // Webpack Fallback Layer (Production Build and Docker environments)
  webpack: (config, { isServer }) => {
    // 1. WebAssembly asynchronous execution features ko unlock karna
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true, // Multi-layered dashboards aur real-time rendering
    };

    // 2. THE CRITICAL FIX: Browser level standard fallback overrides
    // Rust WASM bindings internally node files ('fs') dhoondhti hain, browser me use block karna zaroori hai
    // Server-side WebAssembly evaluation setup
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.lexica.art",
      },
      {
        protocol: "https",
        hostname: "images-assets.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "www.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
    qualities: [25, 50, 75, 90, 100],
  },
};

export default nextConfig;
