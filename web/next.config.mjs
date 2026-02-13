/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Phaser requires some specific handling
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    // Stub out optional dependencies from wagmi/RainbowKit connectors
    // These are only needed for React Native or server-side logging
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };

    return config;
  },
  async rewrites() {
    const apiTarget = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
