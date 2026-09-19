/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

const nextConfig = {
  // output: "standalone" 已注释：与 pnpm 的 .pnpm/ symlink 路径追踪冲突（ENOENT），
  // 且 CloudBase 部署不需要 standalone 产物。需要 self-host 时再启用并配 outputFileTracingIncludes。
  // output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // 锁定文件追踪根目录为本项目，避免 Next.js 推断到 C:\Users\leo\ 的 package-lock.json
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tcb.qcloud.la" },
      { protocol: "https", hostname: "**.cloudbase.net" }
    ]
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }]
      }
    ];
  }
};

export default nextConfig;