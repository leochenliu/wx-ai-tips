# CloudRun 自定义 Dockerfile — Next.js 15 SSR
# 解决 `manageCloudRun source build` 把 Next.js 当 SCF 函数的问题，
# 强制跑 `next start` 常驻进程监听 ${PORT}。

FROM node:20-bookworm-slim AS deps
WORKDIR /workspace
# 公网镜像在 CloudRun 节点拉取失败时，CODING 构建机会走腾讯内网镜像；
# 此处仍保留 `npm ci` 通用流程，依赖通过 `package.json` 锁版本安装。
COPY package.json pnpm-lock.yaml* package-lock.json* .npmrc* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && corepack prepare pnpm@9.12.0 --activate && \
      pnpm install --prod=false; \
    elif [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

FROM node:20-bookworm-slim AS build
WORKDIR /workspace
COPY --from=deps /workspace/node_modules ./node_modules
COPY . .
# 跳过 lint/test 等非必要步骤，专注 build
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && corepack prepare pnpm@9.12.0 --activate && \
      pnpm build; \
    else \
      npm run build; \
    fi

FROM node:20-bookworm-slim AS runner
WORKDIR /workspace
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# 仅拷贝运行时所需：standalone 输出 + 静态资源
# 注意：本项目没有 public/ 目录，COPY --from=build /workspace/public 会失败 → 跳过。
COPY --from=build /workspace/.next ./.next
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/package.json ./package.json
COPY --from=build /workspace/next.config.mjs ./next.config.mjs
EXPOSE 3000
# CloudRun 会注入 ${PORT}，显式传 -p 兜底；同时绑 0.0.0.0
CMD ["sh", "-c", "node node_modules/next/dist/bin/next start -p ${PORT:-3000} -H 0.0.0.0"]
