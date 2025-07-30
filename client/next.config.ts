import type { NextConfig } from "next";
import type { Configuration } from "webpack";

interface WebpackDevMiddlewareConfig {
  watchOptions?: {
    poll?: number;
    aggregateTimeout?: number;
  };
}

const nextConfig: NextConfig = {
  webpack: (config: Configuration, { isServer }: { isServer: boolean }) => {
    // Configure webpack dev middleware through webpack config
    if (!isServer && config.watchOptions) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000, // force polling
        aggregateTimeout: 300, // reduce delay
      };
    }
    
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
    if (!config.resolve) {
      config.resolve = {};
    }
    
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
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
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
