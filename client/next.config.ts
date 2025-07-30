import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpackDevMiddleware: (config: any) => {
    config.watchOptions = {
      poll: 1000, // force polling
      aggregateTimeout: 300, // reduce delay
    };
    return config;
  },
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Fix chunk loading issues
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
    };

    // Ensure proper module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    return config;
  },
};

export default nextConfig;
