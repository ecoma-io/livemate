# CI/CD Pipeline

Hệ thống áp dụng mô hình **Trunk-Based Development** kết hợp **Continuous Deployment** không qua Staging, sử dụng **GitHub Actions** và **Nx Release**.

## Tổng quan Workflows

| File          | Trigger                             | Mục đích                                 |
| ------------- | ----------------------------------- | ---------------------------------------- |
| `pr.yml`      | Pull Request / Merge Group → `main` | Kiểm tra chất lượng code trước khi merge |
| `release.yml` | Manual Dispatch (trên nhánh `main`) | Tạo version tag & CHANGELOG              |
| `deploy.yml`  | Push tag `v*` / Manual Dispatch     | Deploy lên Cloudflare                    |
| `codeql.yml`  | Schedule / PR                       | Security scan (GitHub CodeQL)            |

---

## 1. PR Verification (`pr.yml`)

**Kích hoạt:** Pull Request hoặc Merge Group hướng vào nhánh `main`.

Chạy **2 jobs song song**:

### Job `verify` — Lint, Typecheck, Test, Build

Sử dụng **Nx Affected** để chỉ chạy trên các project bị ảnh hưởng bởi thay đổi:

```
pnpm nx affected -t lint
pnpm nx affected -t typecheck
pnpm nx affected -t test
pnpm nx affected -t build
```

### Job `e2e` — End-to-End Tests (Playwright)

```
pnpm nx affected -t e2e
```

Chạy E2E trên máy chủ CI với Playwright Chromium. Cài đặt qua `.github/actions/setup` composite action (có flag `install-playwright: true`).

**Chốt chặn:** Cả 2 jobs phải xanh 🟢 mới được phép Merge.

---

## 2. Versioning & Release (`release.yml`)

**Kích hoạt:** Thủ công (Manual Dispatch) trên nhánh `main`, có tùy chọn `Dry Run`.

**Yêu cầu:** Chỉ được kích hoạt từ nhánh `main` (checked bởi step đầu trong workflow).

**Luồng thực thi:**

1. Generate GitHub App Token (Ecoma Bot) — cần quyền write để push commit & tag
2. Checkout full history (`fetch-depth: 0`) để đọc commit log
3. Chạy `pnpm nx release [--dry-run]`:
   - Phân tích lịch sử commit (Conventional Commits)
   - Tăng version (Semantic Versioning)
   - Cập nhật `CHANGELOG.md`
   - Tạo Git commit và Git Tag (vd: `v1.2.0`)

---

## 3. Production Deployment (`deploy.yml`)

**Kích hoạt:** Tự động khi có Git Tag mới bắt đầu bằng `v` (do `release.yml` tạo ra), hoặc Manual Dispatch.

**Concurrency**: `cancel-in-progress: true` cho cùng một ref — tránh deploy song song.

**Luồng thực thi (tuần tự, API trước Web):**

```
Step 1: pnpm nx deploy api
  └── wrangler d1 migrations apply livemate --remote  (migration trước)
  └── wrangler deploy                                  (deploy Worker)

Step 2: pnpm nx deploy web
  └── vite build                                       (dependsOn: build)
  └── wrangler pages deploy --branch main             (deploy Pages)
```

> **Lý do API trước Web**: Đảm bảo schema DB đã được migrate trước khi frontend mới được phục vụ. Tuân thủ nguyên tắc **Expand and Contract** cho zero-downtime.

**Biến môi trường cần thiết** (GitHub Secrets):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## Tài liệu liên quan

- [Getting Started](../guide/getting-started.md) — Chạy dự án local
- [Deployment](../guide/deployment.md) — Deploy thủ công
