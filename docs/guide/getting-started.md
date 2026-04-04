# Getting Started

## Prerequisites

- **Node.js** >= 24
- **pnpm** >= 10

## Cài đặt

```bash
git clone <your-repo-url>
cd livemate
pnpm install
```

## Dev Servers

```bash
# Chạy cả API và Web cùng lúc
pnpm dev

# Hoặc chạy riêng lẻ
pnpm nx serve api   # API tại http://localhost:18181
pnpm nx serve web   # Web tại http://localhost:18180
```

**Lưu ý:** `nx serve api` sẽ tự chạy migration D1 local trước khi khởi động Wrangler dev:

```
wrangler d1 migrations apply livemate --local
wrangler dev --port 18181 --ip 0.0.0.0
```

## Môi trường Local

Ứng dụng sử dụng Local D1 (SQLite file do Wrangler quản lý) và thư mục R2 giả lập trên máy — không cần kết nối Cloudflare.

Trong môi trường dev, `apps/web` tự động proxy API calls tới port 18181:

```ts
// apps/web/src/config/apiConfig.ts
export const API_BASE_URL = import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:18181/api` : '/api';
```

## Tài liệu liên quan

- [Development](./development.md) — Lệnh test, lint, typecheck
- [Deployment](./deployment.md) — Deploy lên Production
- [Developer Notes](./developer-notes.md) — Lưu ý quan trọng khi phát triển
