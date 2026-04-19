/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 14 uses experimental.serverComponentsExternalPackages.
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/argon2"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        "@node-rs/argon2",
        "@node-rs/argon2-linux-x64-gnu",
        "@node-rs/argon2-linux-x64-musl",
      );
    }
    return config;
  },
};

export default nextConfig;
