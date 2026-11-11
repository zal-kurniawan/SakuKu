/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      '@prisma/adapter-better-sqlite3',
      '@prisma/adapter-pg',
      'better-sqlite3',
      'pg',
    ],
  },
};

export default nextConfig;
