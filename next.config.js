/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    DATABASE_URL: "postgresql://postgres:Database%401234@db.frzsymaabkcqaqbajetg.supabase.co:5432/postgres?sslmode=require"
  },
  // Remove the standalone output option

  images: {
    domains: [
      'localhost',
      's3.amazonaws.com',
      process.env.S3_BUCKET_NAME ? `${process.env.S3_BUCKET_NAME}.s3.amazonaws.com` : '',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;