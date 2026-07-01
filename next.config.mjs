/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lean, self-contained server output for containerised hosting.
  output: "standalone",
  poweredByHeader: false,
  // Keep native/db packages out of the bundle so their runtime bindings load
  // correctly on the server (and are only loaded when Turso is configured).
  experimental: {
    serverComponentsExternalPackages: [
      "@libsql/client",
      "@prisma/adapter-libsql",
      "@prisma/client",
    ],
  },
  async headers() {
    // Sensible defaults for a personal, single-origin app.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js injects inline bootstrap/runtime styles & scripts.
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
