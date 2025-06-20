import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpackDevMiddleware: (config: any) => {
    config.watchOptions = {
      poll: 1000, // force polling
      aggregateTimeout: 300, // reduce delay
    };
    return config;
  },
};

export default nextConfig;
