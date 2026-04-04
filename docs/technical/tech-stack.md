# Tech Stack

## Core Infrastructure (Cloudflare Native)

| Công nghệ              | Phiên bản | Vai trò                                              |
| ---------------------- | --------- | ---------------------------------------------------- |
| **Nx**                 | 22.6.x    | Monorepo Manager                                     |
| **pnpm**               | 10.x      | Package Manager                                      |
| **Cloudflare Pages**   | —         | Hosting tĩnh cho Frontend (`web`)                    |
| **Cloudflare Workers** | —         | Serverless Edge Runtime cho Backend API              |
| **Cloudflare D1**      | —         | Serverless SQL Database (SQLite) — metadata kịch bản |
| **Cloudflare R2**      | —         | Object Storage — file âm thanh                       |

## Backend (`apps/api`)

| Công nghệ                       | Phiên bản | Vai trò                                           |
| ------------------------------- | --------- | ------------------------------------------------- |
| **Hono.js**                     | ^4.12     | Web framework siêu nhẹ, tối ưu cho Edge/Workers   |
| **Drizzle ORM**                 | ^0.45     | TypeScript ORM tương thích SQLite / Cloudflare D1 |
| **Wrangler**                    | ^4.79     | CLI deploy lên Cloudflare Workers & chạy local    |
| **`@cloudflare/workers-types`** | —         | TypeScript types cho Cloudflare Workers           |
| **Vitest**                      | ~4.0      | Unit & Integration tests cho route handlers       |

## Frontend (`apps/web`)

| Công nghệ            | Phiên bản       | Vai trò                                                     |
| -------------------- | --------------- | ----------------------------------------------------------- |
| **Vue 3**            | ^3.5            | Framework (Composition API, `<script setup>`)               |
| **TypeScript**       | ~5.9            | Type safety                                                 |
| **Vite**             | ^7.0            | Dev server (port **18180**) & build tool                    |
| **TailwindCSS**      | **v4** (`^4.2`) | CSS Framework — sử dụng `@tailwindcss/vite` plugin          |
| **PrimeVue**         | ^4.5            | UI Component Library (Aura Preset)                          |
| **Pinia**            | ^3.0            | State Management                                            |
| **Vue Router**       | ^4.5            | Client-side routing                                         |
| **vue-i18n**         | ^9.14           | Internationalization (EN + VI)                              |
| **Howler.js**        | ^2.2            | Audio Engine (Web Audio API mode → zero-latency)            |
| **`@ffmpeg/ffmpeg`** | ^0.12           | ffmpeg.wasm — render biến thể tốc độ trực tiếp trên browser |
| **vite-plugin-pwa**  | ^1.2            | PWA setup, injectManifest strategy                          |
| **Workbox**          | ^7.4            | Service Worker tooling (precaching, CacheFirst strategy)    |
| **vuedraggable**     | ^4.1            | Drag & Drop sắp xếp Kịch bản (SortableJS wrapper)           |

## Dev Tooling & Code Quality

| Công nghệ                 | Phiên bản | Vai trò                                     |
| ------------------------- | --------- | ------------------------------------------- |
| **ESLint**                | ^9.8      | Linting TypeScript/Vue (flat config)        |
| **Prettier**              | ~3.6      | Code formatting                             |
| **Husky**                 | ^9.1      | Git hooks manager                           |
| **lint-staged**           | ^16.4     | Chạy linter/formatter chỉ trên staged files |
| **commitlint**            | ^20.5     | Enforce Conventional Commits                |
| **Playwright**            | ^1.58     | E2E tests (`apps/web-e2e`)                  |
| **`@vitest/coverage-v8`** | ~4.0      | Coverage reporting                          |

## Tài liệu liên quan

- [Architecture](./architecture.md) — Tổng quan hệ thống
- [Technical Solutions](./technical-solutions.md) — Giải pháp kỹ thuật cốt lõi
