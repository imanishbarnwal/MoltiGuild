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
    return config;
  },
};

export default nextConfig;
