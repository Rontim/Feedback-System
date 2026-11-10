const API_URL = process.env.API_URL ?? "http://localhost:9555";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Browser only ever talks to one origin; Next proxies /api/* to Django.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
