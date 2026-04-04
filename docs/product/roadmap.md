# Development Roadmap

## Phase 1: MVP — Tích hợp toàn diện & Phát hành (v0.x.x)

_Mục tiêu: Hoàn thiện toàn bộ các tính năng cốt lõi MVP và đưa ứng dụng vào vận hành thực tế._

- [x] **Hạ tầng & CI/CD**: Khởi tạo Nx Monorepo, thiết lập chuẩn Code Quality (Husky, ESLint, Prettier), cấu hình pipeline GitHub Actions verify PR và tự động deploy lên Cloudflare.
- [x] **Backend API (Hono/Cloudflare)**: Thiết lập schema bằng Drizzle ORM, viết API quản lý kịch bản (Cloudflare D1) và Endpoint Worker Proxy giao tiếp mượt mà với R2 Object Storage.
- [x] **Admin Module**: Xây dựng UI (Vue 3, PrimeVue), hỗ trợ kéo thả Kịch bản. Đã xử lý upload và phân xuất các biến thể (variants) bằng ffmpeg.wasm trực tiếp trên trình duyệt, có cơ chế chạy chờ để tránh tràn RAM.
- [x] **Player Module (PWA)**: Đảm bảo zero-latency Playback (Howler.js). Tích hợp Service Worker tự động phân giải hash manifest, dùng Cache API để preload và phát ngoại tuyến trơn tru. Có Random Variant selection và Speed Control.
- [x] **Kiểm thử đảm bảo chất lượng**: Cấu hình thành công Unit/Integration Tests (Vitest) và E2E (Playwright), kiểm soát chủ động memory leak với công cụ CDP Memory Profiling.
- [x] **FFmpeg WASM Caching**: Sử dụng Service Worker / Cache API để lưu trữ các file nhị phân dung lượng lớn (`ffmpeg.wasm`). Tránh việc phải kéo lại >20MB mạng mỗi khi load trang, giúp khởi tạo nhân FFmpeg lập tức kể từ lần truy cập thứ hai.

<<<<<<< HEAD

## Phase 3: SaaS Transformation & Multi-tenant (v1.x.x)

_Mục tiêu: Quy hoạch ứng dụng thành một sản phẩm kinh doanh SaaS hoàn chỉnh với khả năng phục vụ số lượng lớn khách hàng (Cá nhân & Agency)._

- [ ] **Xác thực (Authentication)**: Tích hợp giải pháp **Logto** làm Identity Provider, cung cấp quy trình login mượt mà và an toàn. _(Hiện tại: tạm dùng xác thực hardcode để dùng nội bộ.)_
- [ ] **Đa khách hàng (Multi-tenant)**: Xây dựng cấu trúc DB để cô lập dữ liệu (Kịch bản, File audio) giữa các tổ chức/tenant độc lập.
- [ ] **Phân quyền cơ bản (RBAC)**: Quản lý Roles & Permissions dành cho Agency (Có thể thêm/bớt User vào hạ tầng nhóm).
- [ ] # **Billing & Hạn mức (Quotas)**: Quản lý giám sát dung lượng R2 lưu trữ ở từng Tenant và giới hạn số tiền tính vào Ví điện tử.

## Phase 2: SaaS Foundation & Multi-tenant (v1.x.x)

_Mục tiêu: Chuyển đổi kiến trúc sang mô hình SaaS đa khách hàng (Multi-tenant), mở cửa cho người dùng miễn phí (Public Beta)._

- [ ] **Xác thực (Authentication)**: Tích hợp giải pháp **Logto** làm Identity Provider, cung cấp quy trình login, đăng ký mượt mà.
- [ ] **Đa khách hàng (Multi-tenant)**: Xây dựng cấu trúc DB (D1) để cô lập dữ liệu (Kịch bản, File audio) giữa các tổ chức/tenant độc lập.
- [ ] **Phân quyền nội bộ (Internal RBAC)**: Quản lý Roles & Permissions trong Tenant, cho phép Invite Members.

## Phase 3: Monetization & Business Model (v2.x.x)

_Mục tiêu: Đưa vào hoạt động mô hình kinh doanh, thu phí và quản lý giới hạn tài nguyên._

- [ ] **Billing & Payment**: Tích hợp các cổng thanh toán (Stripe/LemonSqueezy) để xử lý Subscription.
- [ ] **Hạn mức (Quotas) & Giới hạn tài nguyên**: Quản lý giám sát dung lượng R2 lưu trữ ở từng Tenant, áp dụng Hard Limits.
- [ ] **Ví điện tử & Tín dụng**: Xây dựng cơ chế trừ/nạp tiền dựa trên mức độ sử dụng thực tế (Pay-as-you-go).
  > > > > > > > saas

## Tài liệu liên quan

- [PRD](./prd.md) — Yêu cầu sản phẩm chi tiết
- [Business Model](./business-model.md) — Mô hình kinh doanh và pricing
