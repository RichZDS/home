#!/usr/bin/env bash
# 构建并发布到 Cloudflare Pages。
# 需要 CLOUDFLARE_API_TOKEN（带 Pages 编辑权限）和 CLOUDFLARE_ACCOUNT_ID，
# 可以写在项目根目录的 .env 里（已被 .gitignore 忽略），也可以先 `npx wrangler login`。
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

PROJECT="${CF_PAGES_PROJECT:-richzds}"

node build.mjs "$@"
npx --yes wrangler@4 pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true
