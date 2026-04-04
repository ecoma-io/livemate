# Developer Notes

Những lưu ý quan trọng cần nắm trước khi can thiệp vào các phần nhạy cảm của dự án.

## Player — Memory Leak

Khi can thiệp vào UI Player, **luôn test rò rỉ bộ nhớ trên thiết bị di động** bằng Safari hoặc Chrome DevTools (Memory tab / CDP Memory Profiling).

- Howler instance cần được gán `null` vào `shallowRef` sau khi dọn dẹp để GC có thể thu hồi.
- Web Audio API trên mobile yêu cầu **user gesture** để unlock `AudioContext`. Đảm bảo UI có capture sự kiện tương tác trước khi phát audio lần đầu.

## iOS Safari — Giới hạn Cache

Cache API trên iOS Safari có thể bị xóa sau **7 ngày không sử dụng**. Cần test kỹ flow re-cache khi cache bị xóa để tránh tình trạng không phát được audio.

## ffmpeg.wasm — SharedArrayBuffer & Mobile

Admin App sử dụng `SharedArrayBuffer` để ffmpeg.wasm hoạt động multi-thread. Cần detect trình duyệt:

- **Desktop**: Multi-thread mode, xử lý nhanh.
- **iOS Safari / Android**: Không hỗ trợ `SharedArrayBuffer` đầy đủ → cần fallback về Single-thread mode. Nên áp dụng chiến lược nạp tuần tự (không song song) trên mobile để tránh crash Safari do giới hạn RAM.

Header COEP/COOP bắt buộc được set ở:

- Dev: Vite middleware trong `vite.config.mts`
- Prod: `apps/web/public/_headers` (Cloudflare Pages)

## CORS — Thêm Origin mới

CORS được cấu hình trong `apps/api/src/index.ts`. Hiện tại cho phép:

- Origin chứa `:18180` (web dev server)
- Origin chứa `livemate.ecoma.io` (production)

Nếu cần thêm môi trường mới (staging, Tailscale IP khác...), cập nhật hàm `origin` trong middleware `cors()`.

## Authentication (Hiện tại)

Auth hiện tại là **xác thực giả (fake auth)** với credential hardcode dùng nội bộ:

```ts
// apps/web/src/stores/auth.ts
const VALID_USERNAME = 'vanila';
const VALID_PASSWORD = 'Vanila123';
```

Session được lưu trong `localStorage`. Đây là giải pháp tạm thời — Phase 3 sẽ tích hợp Logto. **Không expose ứng dụng này public khi chưa có xác thực thật.**

## Tài liệu liên quan

- [Technical Solutions](../technical/technical-solutions.md) — Cơ chế PWA, Cache, OOM
- [Roadmap](../product/roadmap.md) — Phase 3: Authentication & Multi-tenant
