# 🎙️ LiveMate - Trợ Live Điện Tử

> Ứng dụng hỗ trợ live streame phát các đoạn ghi âm kịch bản có sẵn một cách ngẫu nhiên nhằm lách thuật toán quét lặp nội dung của các nền tảng (TikTok, Shopee...). Hệ thống hỗ trợ thay đổi tốc độ phát linh hoạt và cam kết độ trễ bằng không (Zero-Latency) khi bấm nút.

## 1. Product Requirement Document (PRD)

### 🎯 Objective

Xây dựng một công cụ tinh gọn giúp host live stream bấm nút để phát các đoạn audio thoại được thu âm sẵn. Hệ thống tự động chọn ngẫu nhiên một trong các phiên bản thoại khác nhau (Variants) để máy học của nền tảng không phát hiện sự lặp đi lặp lại.

### ⭐ Core Features (MVP)

| Feature                             | Mô tả                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| **Zero-latency Playback**           | Bấm là phát ngay lập tức, không có độ trễ tải file                                           |
| **Pseudo-random Variant Selection** | Chọn ngẫu nhiên file trong nhóm kịch bản, loại trừ file vừa phát cuối cùng                   |
| **Playback Speed Control & Stop**   | Hỗ trợ tốc độ 1.0x, 1.1x, 1.2x, 1.3x, 1.4x, 1.5x chọn toàn cục (Global) và Nút Dừng Khẩn Cấp |
| **Offline Cache Management**        | Tải ngầm file thông qua Service Worker và Cache API, phát offline mượt mà                    |
| **Kịch bản & Màu sắc**              | Kéo thả sắp xếp nhóm kịch bản, gán màu sắc nhận diện để tạo thói quen cơ tay                 |
| **OOM Prevention**                  | Giới hạn file <2MB, Admin tự kích hoạt render thủ công từng biến thể tốc độ                  |

---

## 2. System Architecture

Hệ thống sử dụng mô hình **Monorepo** được quản lý bởi **Nx**, với kiến trúc **100% Serverless** tối ưu hoàn toàn cho hệ sinh thái **Cloudflare**:

### 📁 Project Structure

```
livemate/
├── apps/
│   ├── api/            # Hono.js API (Cloudflare Workers, D1 Database, R2 Worker Proxy)
│   ├── web/            # Vue 3 SPA (Gộp chung giao diện Player và Admin, chạy ffmpeg.wasm tại Local)
│   └── web-e2e/        # Playwright E2E tests
├── .husky/             # Git hooks (commit-msg, pre-commit)
├── eslint.config.mjs   # ESLint flat config
├── .prettierrc         # Prettier config
├── .lintstagedrc.json
└── commitlint.config.cjs
```

### 🔄 Data Flow

```
                                     ↓
Admin tạo Kịch bản (gán màu) ➜ Upload audio gốc (<2MB) vào Track của Kịch bản ➜ Trình duyệt tải `ffmpeg.wasm`
                                      ↓
              Hệ thống hiện cảnh báo ⚠️ thiếu biến thể ➜ Admin bấm nút render thủ công các tốc độ 1.1x ~ 1.5x (Tuần tự chống OOM)
                                      ↓
              Admin upload file qua API Worker Proxy ➜ Worker lưu trực tiếp vào Cloudflare R2
                                      ↓
              Admin gọi API Hono để lưu metadata vào Cloudflare D1 ➜ Hoàn tất upload!
                                      ↓
              Player khởi động ➜ SW check hash manifest từ API Hono
                                      ↓
              Cache miss/outdated ➜ Background fetch & cache file mới từ R2 thông qua Cache API | Cache hit ➜ Skip
                                      ↓
              Host đổi tốc độ chung ➜ Bấm nút Play trên Kịch bản ➜ Chọn Random 1 biến thể ẩn
                                      ↓
              Howler fetch ➜ SW intercept ➜ Trả từ Cache API ➜ Decode ➜ Phát (zero-latency)
```

---

## 3. Tech Stack

### 🛠️ Core Infrastructure (Cloudflare Native)

| Công nghệ              | Vai trò                                             |
| ---------------------- | --------------------------------------------------- |
| **Nx**                 | Monorepo Manager                                    |
| **Cloudflare Pages**   | Hosting tĩnh miễn phí cho Frontend (`web`)          |
| **Cloudflare Workers** | Serverless Edge Runtime cực nhanh cho Backend API   |
| **Cloudflare D1**      | Serverless SQL Database (Lưu trữ kịch bản/metadata) |
| **Cloudflare R2**      | Object Storage (Lưu trữ file âm thanh)              |

### 🟢 Backend (`api`)

| Công nghệ       | Vai trò                                                        |
| --------------- | -------------------------------------------------------------- |
| **Hono.js**     | Web framework siêu nhẹ, khởi động 0ms tối ưu cho Edge/Workers  |
| **Drizzle ORM** | TypeScript ORM tương thích hoàn hảo với SQLite / Cloudflare D1 |

### 🔵 Frontend (`web`)

| Công nghệ                | Vai trò                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| **Vue 3**                | Framework (Composition API, `<script setup>`)                           |
| **ffmpeg.wasm**          | Xử lý Audio trực tiếp trên trình duyệt Admin (Không cần backend worker) |
| **PrimeVue**             | UI Library (chủ yếu cho Admin)                                          |
| **TailwindCSS**          | CSS Framework (Responsive Mobile/Tablet)                                |
| **Pinia**                | State Management                                                        |
| **Howler.js**            | Audio Engine (Web Audio API mode → zero-latency)                        |
| **PWA (Service Worker)** | Offline support, Cache API cho audio files                              |
| **Workbox**              | Service Worker tooling (precaching, runtime caching)                    |
| **vuedraggable**         | Drag & Drop sắp xếp Kịch bản (SortableJS wrapper cho Vue 3)             |

### 🔧 Code Quality & DX

| Công cụ         | Vai trò                                                     |
| --------------- | ----------------------------------------------------------- |
| **ESLint**      | Linting TypeScript/Vue (`@nx/eslint`, `eslint-plugin-vue`)  |
| **Prettier**    | Code formatting (tự động qua ESLint integration)            |
| **Vitest**      | Unit & Integration testing                                  |
| **Playwright**  | End-to-End testing                                          |
| **Husky**       | Git hooks manager                                           |
| **lint-staged** | Chạy linter/formatter chỉ trên staged files                 |
| **commitlint**  | Enforce Conventional Commits (`feat:`, `fix:`, `chore:`...) |

---

## 4. Technical Solutions

Các giải pháp kỹ thuật bắt buộc trong trang Player của `apps/web` để đảm bảo mượt mà và không tràn RAM trên thiết bị yếu/di động:

### 📦 PWA, Service Worker & Cache API

- Player được đóng gói dưới dạng **Progressive Web App (PWA)**, hỗ trợ offline hoàn toàn (Offline Resilience), không sập khi rớt mạng tĩnh.
- **Workbox Precaching**: Quản lý cache cho App Shell (HTML, JS, CSS) tự động qua Vite build manifest.
- **Runtime Audio Caching**: Service Worker intercept request tới `/api/audio/*` → CacheFirst strategy. Đồng thời, SW nhận lệnh từ main thread để đồng bộ audio cache dựa trên API manifest.
- **Hash-based cache validation**: API `GET /api/manifest` trả về manifest chứa content hash. SW so sánh version → chỉ tải lại file có thay đổi, xóa file không còn trong manifest. Phát lại dữ liệu offline khi rớt mạng được chấp nhận.

### 🧠 Tối ưu bộ nhớ & Chống OOM (Out Of Memory)

- **Hard Limit**: Chỉ cho phép tải lên file gốc có kích thước `< 2MB`. Định dạng được chấp nhận: **MP3, M4A/AAC, WAV, OGG, WebM** (các định dạng phổ biến từ ứng dụng ghi âm Android/iOS). Các biến thể tốc độ (1.1x ~ 1.5x) luôn được xuất ra định dạng MP3 qua `ffmpeg.wasm`.
- Thay vì tự động phân xuất tất cả bản đồng loạt bắt thiết bị gánh, hệ thống chỉ giữ file gốc (1.0x).
- File nào thiếu bản tốc độ (1.1x, 1.2x, 1.3x, 1.4x, 1.5x) sẽ gắn Warning Icon (⚠️).
- Admin sử dụng nút để kích hoạt render thủ công rời rạc qua `ffmpeg.wasm` cho từng tốc độ. Rendering xong từng cái là upload, giải phóng rác trong RAM hiệu quả.

### ⏳ Cơ chế Playback & Lazy Loading

- Mặc định chỉ tải file `1.0x`.
- Khi đổi tốc độ chung bằng bộ chọn (Global Speed Selector), hệ thống sẽ unload pool cũ và fetch pool bản tốc độ tương ứng.
- Force Garbage Collection: Gán `null` vào `shallowRef` của Vue khi dọn dẹp Howler instance để tránh Memory Leak trong phiên stream dài.

### 🗄️ Database Schema & R2 Storage Management

- **Cấu trúc 1-N-N linh hoạt**: DB có 3 tầng — `scripts` (kịch bản) → `tracks` (bản thu gốc) → `variants` (biến thể tốc độ). Dùng cấu trúc quan hệ thay vì cột cứng `url_1x`, `url_1_2x` để dễ mở rộng tốc độ sau này. Tốc độ được validate tại backend: `[1.0, 1.1, 1.2, 1.3, 1.4, 1.5]`. Độ trễ query không phải là vấn đề vì độ trễ quyết định nằm ở lúc phát (playback).
- **Trình Dọn Rác R2 (Cron Trigger)**: Thiết lập Cron Trigger chạy hàng ngày (3:00 UTC) để quét và tự động xóa các file trên Cloudflare R2 bị "mồ côi" do các upload bị đứt kết nối giữa chừng (chưa lưu vào D1).

---

## 5. CI/CD Pipeline

Hệ thống áp dụng mô hình **Trunk-Based Development** kết hợp **Continuous Deployment (CD)** không qua Staging, sử dụng **GitHub Actions** và **Nx Release**. Đảm bảo tốc độ release cực nhanh nhưng vẫn an toàn tuyệt đối thông qua 3 chốt chặn:

### 🛡️ 1. Pull Request Verification (`pr.yml`)

- **Kích hoạt:** Khi có Pull Request (PR) hướng vào nhánh `main`.
- **Nhiệm vụ:** Sử dụng **Nx Affected** để chạy Lint, Unit Test, và quan trọng nhất là **E2E Test (Playwright)** trên máy chủ local của CI.
- **Chốt chặn:** Mã nguồn phải vượt qua 100% các bài test tự động (Xanh 🟢) mới được phép Merge. Lỗi UI/UX hoặc Logic sẽ bị chặn tại đây.

### 📦 2. Versioning & Release (`release.yml`)

- **Kích hoạt:** Kích hoạt thủ công (Manual Dispatch) trên nhánh `main` khi gom đủ tính năng chờ phát hành.
- **Nhiệm vụ:** Chạy lệnh `nx release`.
- **Chốt chặn:** Tự động phân tích lịch sử commit (Conventional Commits) để tăng phiên bản (Semantic Versioning), tạo file `CHANGELOG.md` tự động, tự tạo Git Commit và đánh Git Tag (ví dụ: `v1.2.0`).

### 🚀 3. Production Deployment (`deploy.yml`)

- **Kích hoạt:** Chạy tự động khi GitHub ghi nhận có một **Git Tag mới** (được tạo ở bước 2).
- **Nhiệm vụ (Zero-Downtime):**
  - **Database:** Chạy Migration D1 với cam kết tương thích ngược (áp dụng nguyên tắc Expand and Contract).
  - **Backend:** Triển khai (Deploy) Hono API lên **Cloudflare Workers**.
  - **Frontend:** Triển khai (Deploy) giao diện Web lên **Cloudflare Pages**.
- **Chốt chặn:** Kết hợp Feature Flags trên Production để bật/tắt tính năng an toàn mà không cần rollback code.

---

## 6. Development Roadmap

Roadmap này chia nhỏ quá trình phát triển hệ thống **LiveMate** thành các giai đoạn (Phases) cụ thể dựa trên [Product Requirement Document (PRD)](#1-product-requirement-document-prd).

### Phase 1: MVP - Tích hợp toàn diện & Phát hành

_Mục tiêu: Hoàn thiện toàn bộ các tính năng cốt lõi MVP và đưa ứng dụng vào vận hành thực tế._

- [x] **Hạ tầng & CI/CD**: Khởi tạo Nx Monorepo, thiết lập chuẩn Code Quality (Husky, ESLint, Prettier), cấu hình pipeline GitHub Actions verify PR và tự động deploy lên Cloudflare.
- [x] **Backend API (Hono/Cloudflare)**: Thiết lập schema bằng Drizzle ORM, viết API quản lý kịch bản (Edge D1) và Endpoint Worker Proxy giao tiếp mượt mà với R2 Object Storage.
- [x] **Admin Module**: Xây dựng UI (Vue 3, PrimeVue), hỗ trợ kéo thả Kịch bản. Đã xử lý upload và phân xuất các biến thể (variants) bằng ffmpeg.wasm trực tiếp trên trình duyệt, có cơ chế chạy chờ để tránh tràn RAM.
- [x] **Player Module (PWA)**: Đảm bảo zero-latency Playback (Howler.js). Tích hợp Service Worker tự động phân giải hash manifest, dùng Cache API để preload và phát ngoại tuyến trơn tru. Có Random Variant selection và Speed Control.
- [x] **Kiểm thử đảm bảo chất lượng**: Cấu hình thành công Unit/Integration Tests (Vitest) và E2E (Playwright), kiểm soát chủ động memory leak với công cụ CDP Memory Profiling.

### Phase 2: Nâng cấp Hiệu năng Tối đa (Performance v2)

_Mục tiêu: Tập trung vào các API web mới nhất để tối ưu hóa tài nguyên và nâng mức trải nghiệm, đặc biệt ở trang quản trị (Admin)._

- [ ] **Phát Nhạc Nền (Background Music)**: Thêm tính năng phát nhạc nền thả vi để biến Live Mate giống như một trợ lý live điện tử thực thụ.
- [ ] **FFmpeg WASM Caching**: Sử dụng Service Worker / Cache API để lưu trữ các file nhị phân dung lượng lớn (`ffmpeg.wasm`, `ffmpeg-core.js`). Tránh việc phải kéo lại >20MB mạng mỗi khi load trang, giúp khởi tạo nhân FFmpeg lập tức kể từ lần truy cập thứ hai.
- [ ] **Web Worker cho FFmpeg**: Tách toàn bộ module mã hóa/giải mã âm thanh nặng (CPU-bound) vào một tiến trình Web Worker chạy ngầm, từ đó trả lại luồng (Main Thread) cho trình duyệt để UI hiển thị tải/render vẫn mượt mà không bị đóng băng (block UI).
- [ ] **Chuẩn hóa Âm lượng (Auto Audio Normalization)**: Tích hợp bộ lọc âm thanh của FFmpeg (như `-af loudnorm`) trong lúc xử lý file nguồn để tự động cân bằng mức âm lượng (LUFS) cho mọi file và biến thể, đảm bảo âm thanh phát ra không bị lúc to lúc nhỏ gây giật mình trên live stream.

### Phase 3: SaaS Transformation & Multi-tenant

_Mục tiêu: Quy hoạch ứng dụng thành một sản phẩm kinh doanh SaaS hoàn chỉnh với khả năng phục vụ số lượng lớn khách hàng (Cá nhân & Agency)._

- [ ] **Xác thực (Authentication)**: Tích hợp giải pháp **Logto** làm Identity Provider, cung cấp quy trình login mượt mà và an toàn.
- [ ] **Đa khách hàng (Multi-tenant)**: Xây dựng cấu trúc DB để cô lập dữ liệu (Kịch bản, File audio) giữa các tổ chức/tenant độc lập.
- [ ] **Phân quyền cơ bản (RBAC)**: Quản lý Roles & Permissions dành cho Agency (Có thể thêm/bớt User vào hạ tầng nhóm).
- [ ] **Billing & Hạn mức (Quotas)**: Quản lý giám sát dung lượng R2 lưu trữ ở từng Tenant và giới hạn số tiền tính vào Ví điện tử.

---

## 7. Developer Guide

### 📋 Prerequisites

- **Node.js** >= 24
- **pnpm** >= 10

### 🚀 Quick Start

```bash
# 1. Clone & cài đặt
git clone <your-repo-url>
cd livemate
pnpm install

# 2. Chạy môi trường Local Development kết nối Cloudflare
# Ứng dụng sẽ sử dụng Local D1 (SQLite) và thư mục lưu trữ R2 giả lập ở máy bằng Wrangler
pnpm dev
# Hoặc chạy riêng lẻ bằng Nx:
npx nx serve api
npx nx serve web
```

### 🧪 Testing

```bash
# Unit & Integration tests (Vitest)
npx nx test <project>          # Test 1 project
npx nx run-many -t test        # Test tất cả projects

# E2E tests (Playwright)
npx nx e2e web-e2e
```

### 🔍 Linting & Formatting

```bash
# Lint toàn bộ workspace
npx nx run-many -t lint

# Format code
npx prettier --write .
```

> **Note:** Husky + lint-staged sẽ tự động chạy ESLint & Prettier trên staged files khi commit. commitlint đảm bảo commit message theo chuẩn [Conventional Commits](https://www.conventionalcommits.org/).

### ☁️ Production Deployment

```bash
# Triển khai backend lên Cloudflare Workers & D1
npx nx deploy api

# Triển khai frontend lên Cloudflare Pages
npx nx deploy web
```

### ⚠️ Lưu ý cho Developer

- Khi can thiệp vào UI Player, **luôn test rò rỉ bộ nhớ (Memory Leak)** trên thiết bị di động bằng Safari hoặc Chrome DevTools.
- **Admin App & `ffmpeg.wasm` (Tối đa hiệu suất):**
  - Để tận dụng `SharedArrayBuffer` cho phép xử lý đa luồng qua Wasm, file cấu hình `_headers` của Cloudflare Pages cho Frontend phải được cấu hình `Cross-Origin-Opener-Policy: same-origin` và `Cross-Origin-Embedder-Policy: require-corp`. Cần cấu hình luồng CORS cho Hono API và R2 cẩn thận để các file từ backend vẫn fetch được bên trong môi trường bảo vệ này. Tùy chọn cách cấu hình sao cho Wasm phát huy sức mạnh tối đa.
  - Cần viết logic detect trình duyệt di động (iOS Safari/Android) và tự động fallback về Single-thread, đồng thời có thể áp dụng chiến lược nạp tuần tự từng file trên mobile để tránh Crash Safari do giới hạn RAM.
- **iOS Safari**: Cache API có thể bị xóa sau 7 ngày không sử dụng. Cần test kỹ flow re-cache.
- **Mobile Audio**: Web Audio API trên mobile yêu cầu user gesture để unlock AudioContext. Đảm bảo UI có nút "Bắt đầu" trước khi phát.
- Commit message phải theo format: `type(scope): message` (ví dụ: `feat(player): add speed selector`).

## 8. UI Design Guidance

### 🎨 Theme & Colors

Hệ thống sử dụng **Electric Purple** (`#8b5cf6`) làm màu chủ đạo (Primary Color), đồng bộ từ thiết kế Logo (phát sóng radio) cho đến bộ theme của PrimeVue.

Bảng màu Primary (Tailwind / PrimeVue):

- `50`: `#f5f3ff`
- `100`: `#ede9fe`
- `200`: `#ddd6fe`
- `300`: `#c4b5fd`
- `400`: `#a78bfa`
- `500`: `#8b5cf6` (Base/Logo)
- `600`: `#7c3aed`
- `700`: `#6d28d9`
- `800`: `#5b21b6`
- `900`: `#4c1d95`
- `950`: `#2e1065`

Giao diện sử dụng hệ thống Design System của **PrimeVue (Aura Preset)** kết hợp với **TailwindCSS** để đảm bảo tính đồng nhất mạnh mẽ. Màu sắc này giúp giao diện trở nên nổi bật nhưng vẫn giữ được độ thân thiện và dễ nhìn khi sử dụng trong thời gian dài (live stream).

---

## 9. Mô hình Kinh doanh (Business Model)

LiveMate vận hành theo mô hình **SaaS Freemium** kết hợp **Hybrid Billing** (Thu phí gói cố định + Pay-as-you-go cho tài nguyên thực tế).

- **Target:** Cá nhân livestream (Free/Pro), các Agency quản lý KOC (Agency/Enterprise).
- **Core Value:** Thay thế ekip kỹ thuật bằng tự động hóa âm thanh/kịch bản.
- **Infrastructure Strategy:** **Serverless-First** (Cloudflare Stack) giúp biên lợi nhuận cao nhờ chi phí vận hành cực thấp.

---

## 10. Cấu trúc Giá & Thanh toán (Pricing & Billing)

Hệ thống sử dụng cơ chế **Wallet Top-up**. Phí gói hàng tháng sẽ được trừ vào ví, phần vượt hạn mức (Storage) sẽ tính phí theo ngày hoặc cuối chu kỳ.

| Feature           | **FREE**         | **PRO**                                          | **AGENCY**        | **ENTERPRISE**     |
| :---------------- | :--------------- | :----------------------------------------------- | :---------------- | :----------------- |
| **Giá tháng**     | 0đ               | **49.000đ** (~$2)                                | **79.000đ** (~$3) | **119.000đ** (~$5) |
| **User limit**    | 1 User (Owner)   | Max **5 Users**                                  | Max **12 Users**  | **Unlimited**      |
| **Max File Size** | 1MB              | 2MB                                              | 2MB               | 2MB                |
| **Variants**      | Limited (e.g. 2) | Unlimited                                        | Unlimited         | Unlimited          |
| **Storage Quota** | 50MB (Free)      | 500MB (Included)                                 | 1GB (Included)    | 2GB (Included)     |
| **Pay-as-you-go** | N/A              | **~5.000đ/GB/tháng** cho dung lượng vượt hạn mức |

**Cơ chế Pay-as-you-go:**

- Chỉ tính phí trên **Peak Storage** (Dung lượng lưu trữ cao nhất ghi nhận được trong chu kỳ).
- Tính phí dựa trên **Total Users** nếu vượt quá slot của gói (nếu bạn cho phép add thêm user ngoài gói).

---

## 11. Phân tích Chi phí Vận hành (Cost Analysis)

Vì bạn đẩy **Rendering** về Client-side, chi phí Backend gần như bằng 0 ở quy mô nhỏ.

- **Compute (CF Workers/Pages):** Miễn phí cho 100k requests/ngày. Gói $5/tháng của CF Workers (nếu nâng cấp) cho phép 10 triệu requests.
- **Database (CF D1):** Miễn phí đến 5GB dữ liệu. Với metadata của kịch bản, 5GB có thể chứa dữ liệu cho hàng chục nghìn user.
- **Storage (CF R2):**
  - $0.015/GB/tháng.
  - Miễn phí 10GB đầu tiên hàng tháng.
  - **Egress (Băng thông tải file):** 0đ (Lợi thế lớn nhất của R2).
- **IAM (Logto):** Free đến 5,000 MAU.
- **Email (Brevo):** Free 300 emails/ngày.

**Kết luận:** Với 1,000 user đầu tiên, chi phí thực tế bạn trả cho Cloudflare gần như là **0 VNĐ** (nằm trong Free Tier).

---

## 12. Bài toán Kịch bản Tài chính (Financial Scenarios)

Giả sử tỷ lệ chuyển đổi từ Free sang Paid là **5%**.

### Kịch bản A: Quy mô nhỏ (1.000 Users)

- **Free Users:** 950 người (Chi phí: ~$0).
- **Pro Users:** 50 người x 49k = **2.450.000đ/tháng.**
- **Chi phí vận hành:** 0đ (Vẫn nằm trong Free Tier của CF/Logto).
- **Lợi nhuận:** ~2.4tr VNĐ (Đủ trà đá, cafe và duy trì domain).

### Kịch bản B: Quy mô trung bình (10.000 Users)

- **Free Users:** 9.500 người.
- **Paid Users (Mix Pro/Agency/Enterprise):** 500 người.
- **Doanh thu trung bình:** 500 x 70k (average) = **35.000.000đ/tháng.**
- **Chi phí vận hành:**
  - CF Workers Paid Plan: $5 (~125k).
  - R2 Storage (Giả sử tổng 500GB): (500-10) \* $0.015 = $7.35 (~180k).
  - Logto Cloud (nếu vượt 5k MAU): ~$50 (~1.2tr).
- **Lợi nhuận:** **~33.500.000đ/tháng.**

### Kịch bản C: Quy mô lớn (Agency-focused)

Nếu bạn có 100 Agency sử dụng gói Enterprise:

- **Doanh thu:** 100 x 119k = **11.900.000đ/tháng.**
- **Lợi nhuận:** Cực cao vì số lượng User/Tenant lớn nhưng thực tế dung lượng R2 không tăng quá nhanh do file audio rất nhỏ.

---

## 13. Nhận xét của chuyên gia (System Architect View)

1.  **Chiến lược "Low Price - High Volume":** Với mức giá 49k-119k, bạn đánh trúng tâm lý "mua không cần nghĩ" của chủ shop Việt Nam.
2.  **Khả năng Anti-Fragile:** Nhờ dùng **Serverless**, nếu app đột ngột "viral" và tăng vọt user, hệ thống sẽ tự scale mà không bị sập (Auto-scaling). Chi phí chỉ tăng khi có người dùng thật, giúp bạn không bao giờ bị lỗ vốn cố định.
3.  **Tối ưu R2:** Bạn nên thiết lập **Lifecycle Rule** cho R2. Ví dụ: Các biến thể của Tenant Free sẽ bị xóa sau 30 ngày không hoạt động để tiết kiệm dung lượng.
4.  **Thanh toán:** Để tối ưu phí, bạn nên dùng **VietQR Pro** hoặc các bên như **Cassie** để auto-check biến động số dư, giúp việc Top-up diễn ra 24/7 mà không cần bạn can thiệp.
