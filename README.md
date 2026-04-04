# 🎙️ LiveMate - Trợ Live Điện Tử

> Ứng dụng hỗ trợ live stream phát các đoạn ghi âm kịch bản có sẵn một cách ngẫu nhiên, giúp giảm nhân sự của ekip livestream. Hỗ trợ thay đổi tốc độ phát linh hoạt và độ trễ bằng không (Zero-Latency) khi bấm nút.

**Production:** [livemate.ecoma.io](https://livemate.ecoma.io)

## Quick Start

```bash
# Yêu cầu: Node.js >= 24, pnpm >= 10
git clone <your-repo-url>
cd livemate
pnpm install
pnpm dev          # Web: http://localhost:18180 | API: http://localhost:18181
```

Xem thêm: [docs/guide/getting-started.md](docs/guide/getting-started.md)

## Documentation

### Product

| Tài liệu                                         | Nội dung                                   |
| ------------------------------------------------ | ------------------------------------------ |
| [PRD](docs/product/prd.md)                       | Mục tiêu, Core Features                    |
| [Roadmap](docs/product/roadmap.md)               | Lộ trình phát triển theo Phase             |
| [Business Model](docs/product/business-model.md) | Mô hình kinh doanh, Pricing, Cost Analysis |

### Technical

| Tài liệu                                                     | Nội dung                                  |
| ------------------------------------------------------------ | ----------------------------------------- |
| [Architecture](docs/technical/architecture.md)               | Cấu trúc hệ thống, DB Schema, Data Flow   |
| [Tech Stack](docs/technical/tech-stack.md)                   | Danh sách công nghệ và phiên bản          |
| [Technical Solutions](docs/technical/technical-solutions.md) | PWA/SW, OOM Prevention, Playback, Cron GC |

### DevOps

| Tài liệu                               | Nội dung                                       |
| -------------------------------------- | ---------------------------------------------- |
| [CI/CD Pipeline](docs/devops/ci-cd.md) | GitHub Actions workflows (PR, Release, Deploy) |

### Guides

| Tài liệu                                         | Nội dung                                        |
| ------------------------------------------------ | ----------------------------------------------- |
| [Getting Started](docs/guide/getting-started.md) | Cài đặt, Dev servers, môi trường local          |
| [Development](docs/guide/development.md)         | Test, Lint, Typecheck, Build, Commit convention |
| [Deployment](docs/guide/deployment.md)           | Deploy thủ công lên Cloudflare                  |
| [Developer Notes](docs/guide/developer-notes.md) | Memory leak, iOS Safari, CORS, Auth hiện tại    |
| [UI Design](docs/guide/ui-design.md)             | Theme, màu sắc, Design System                   |
