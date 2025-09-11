/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "2mb" } },

  async headers() {
    return [
      {
        source: "/(.*)", // 모든 라우트에 적용
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // ✅ 외부 이미지 허용 도메인
              "img-src 'self' data: https: s.wordpress.com image.thum.io www.google.com",
              // ✅ 쿠팡 위젯 iframe 허용
              "frame-src 'self' https://ads-partners.coupang.com",
              // ✅ 기본 허용 (필요하면 더 줄일 수 있음)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "style-src 'self' 'unsafe-inline' https:",
              "connect-src 'self' https:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
