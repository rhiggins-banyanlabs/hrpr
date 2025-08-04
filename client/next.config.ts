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
    
    // Fix chunk loading issues - MODIFIED VERSION
    if (!isServer) {
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
              enforce: true,
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
    }

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

    // Add global polyfills for browser-specific code
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Add any additional browser-specific fallbacks here
      };
    }

    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    // Fix for "self is not defined" error
    config.plugins = config.plugins || [];
    
    if (!isServer) {
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.DefinePlugin({
          'typeof self': JSON.stringify('object'),
        })
      );
    }

    return config;
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Add experimental features to help with SSR issues
  experimental: {
    esmExternals: 'loose',
  },
};

export default nextConfig;