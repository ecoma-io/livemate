# Deployment

## Deploy thủ công lên Production

Thông thường deploy được kích hoạt tự động qua Git Tag (xem [CI/CD Pipeline](../devops/ci-cd.md)). Các lệnh dưới đây dùng cho trường hợp cần deploy thủ công.

**Yêu cầu:** Biến môi trường `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID` đã được set.

### Deploy API (Cloudflare Workers)

```bash
pnpm nx deploy api
```

Lệnh này chạy tuần tự:

1. `wrangler d1 migrations apply livemate --remote` — áp dụng migration D1 trên Production
2. `wrangler deploy` — deploy Hono Worker

### Deploy Web (Cloudflare Pages)

```bash
pnpm nx deploy web
```

Lệnh này chạy tuần tự:

1. `vite build` — build frontend
2. `wrangler pages deploy --branch main` — deploy lên Cloudflare Pages

### Thứ tự bắt buộc

**Luôn deploy API trước, Web sau.** Migration DB phải hoàn tất trước khi frontend mới được phục vụ để đảm bảo không có schema mismatch (zero-downtime theo nguyên tắc Expand and Contract).

## Migrations

Tạo migration mới:

```bash
pnpm nx run api:generate-migration --name=<tên_migration>
```

File migration được đặt trong `apps/api/migrations/`. Migrations được áp dụng tự động khi deploy API.

## Tài liệu liên quan

- [CI/CD Pipeline](../devops/ci-cd.md) — Quy trình deploy tự động qua GitHub Actions
- [Getting Started](./getting-started.md) — Chạy local với D1/R2 giả lập
