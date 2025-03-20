/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@film-scheduler/film-source-golden-horse']
  }
}

export default nextConfig;
