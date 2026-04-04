# System Architecture

## Tổng quan

LiveMate sử dụng mô hình **Monorepo** được quản lý bởi **Nx**, với kiến trúc **100% Serverless** tối ưu hoàn toàn cho hệ sinh thái **Cloudflare**.

**Production domain:** `livemate.ecoma.io`

## Cấu trúc Dự án

```
livemate/
├── apps/
│   ├── api/            # Hono.js API (Cloudflare Workers, D1 Database, R2 Worker Proxy)
│   ├── web/            # Vue 3 SPA (Giao diện Player và Admin, chạy ffmpeg.wasm tại Client)
│   └── web-e2e/        # Playwright E2E tests
├── .github/
│   ├── actions/setup/  # Reusable GitHub Actions composite action
│   └── workflows/      # CI/CD pipelines (pr.yml, release.yml, deploy.yml, codeql.yml)
├── .husky/             # Git hooks (commit-msg, pre-commit)
├── eslint.config.mjs   # ESLint flat config (workspace-level)
├── .prettierrc         # Prettier config
└── commitlint.config.cjs
```

## Database Schema

Ba bảng chính trong Cloudflare D1 (SQLite):

```
scripts (kịch bản)
  └── tracks (bản thu gốc)
        └── variants (biến thể tốc độ)
```

| Bảng       | Các cột quan trọng                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `scripts`  | `id` (UUID), `name`, `color`, `sort_order`                                                                                     |
| `tracks`   | `id` (UUID), `script_id` (FK → scripts, cascade), `name`                                                                       |
| `variants` | `id` (UUID), `track_id` (FK → tracks, cascade), `speed` (real), `r2_key`, `content_hash`, `file_size`, `mime_type`, `duration` |

Ràng buộc: `unique_track_speed` trên `(track_id, speed)` — mỗi track chỉ có một variant mỗi tốc độ.

Tốc độ được validate cứng tại backend: `[1.0, 1.1, 1.2, 1.3, 1.4, 1.5]`.

## Data Flow

```
Admin tạo Kịch bản (gán màu) ➜ Upload audio gốc (<2MB) vào Track của Kịch bản
                                      ↓
      Trình duyệt khởi động ffmpeg.wasm (nặng ~20MB, được cache bởi Service Worker)
                                      ↓
      Hệ thống hiện cảnh báo ⚠️ thiếu biến thể ➜ Admin bấm nút render thủ công
      từng tốc độ 1.1x ~ 1.5x (Tuần tự chống OOM)
                                      ↓
      Admin upload file MP3 qua API Worker Proxy ➜ Worker lưu trực tiếp vào R2
                                      ↓
      API Hono lưu metadata (r2_key, hash, size, duration...) vào D1 ➜ Hoàn tất!
                                      ↓
      Player khởi động ➜ SW nhận lệnh SYNC_AUDIO từ main thread
                                      ↓
      SW fetch GET /api/manifest ➜ So sánh version hash
                                      ↓
      Cache miss/outdated ➜ Background fetch & cache file từ R2 | Cache hit ➜ Skip
                                      ↓
      Host đổi tốc độ chung ➜ Bấm nút Play trên Kịch bản ➜ Chọn random 1 biến thể
                                      ↓
      Howler fetch audio URL ➜ SW intercept ➜ Trả từ Cache API ➜ Decode ➜ Phát (zero-latency)
```

## Tài liệu liên quan

- [Tech Stack](./tech-stack.md) — Danh sách công nghệ chi tiết
- [Technical Solutions](./technical-solutions.md) — Giải pháp kỹ thuật cốt lõi
- [CI/CD Pipeline](../devops/ci-cd.md) — Quy trình build & deploy
