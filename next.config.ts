import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      // Webview may be framed only by the app itself; admin never.
      { source: '/admin/:path*', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] },
      { source: '/login', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] },
    ];
  },
};
export default config;
