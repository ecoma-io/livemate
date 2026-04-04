# Technical Solutions

Các giải pháp kỹ thuật bắt buộc trong `apps/web` để đảm bảo phát mượt và không tràn RAM trên thiết bị yếu/di động.

## PWA, Service Worker & Cache API

Player được đóng gói dưới dạng **Progressive Web App (PWA)**, hỗ trợ offline hoàn toàn.

- **Workbox Precaching**: Quản lý cache App Shell (HTML, JS, CSS) tự động qua `vite-plugin-pwa` với chiến lược `injectManifest`.
- **Runtime Audio Caching**: Service Worker intercept request tới `/api/audio/*` → `CacheFirst` strategy với cache name `livemate-audio-v1`.
- **FFmpeg Binary Caching**: Service Worker cache các asset `/@ffmpeg/*` (ffmpeg.wasm, ffmpeg-core.js) vào `livemate-assets-v1`. Tránh tải lại >20MB khi load trang lần sau.
- **Hash-based Cache Sync**: Main thread gửi message `{ type: 'SYNC_AUDIO' }` → SW fetch `GET /api/manifest` → so sánh `version` → chỉ tải lại file có thay đổi, xóa file không còn trong manifest.

```
sw.ts: CacheFirst cho /api/audio/*
     → cache: livemate-audio-v1
     → matchOptions: { ignoreSearch: true }

sw.ts: CacheFirst cho /@ffmpeg/*
     → cache: livemate-assets-v1
```

## COEP/COOP Headers (SharedArrayBuffer cho ffmpeg.wasm)

Để ffmpeg.wasm hoạt động multi-thread qua `SharedArrayBuffer`, cần hai HTTP header:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

- **Dev**: Vite dev server tự inject (`vite.config.mts` có custom middleware).
- **Prod**: Cấu hình trong `apps/web/public/_headers` (Cloudflare Pages).
- **API**: Hono middleware set header `Cross-Origin-Resource-Policy: cross-origin` để audio file từ backend fetch được trong môi trường COEP này.

## Tối ưu Bộ nhớ & Chống OOM (Out Of Memory)

- **Hard Limit**: Chỉ cho phép upload file gốc `< 2MB`. Định dạng hỗ trợ: MP3, M4A/AAC, WAV, OGG, WebM. Biến thể tốc độ (1.1x ~ 1.5x) luôn xuất ra MP3 qua ffmpeg.wasm.
- **Manual Render**: Hệ thống chỉ giữ file gốc (1.0x) sau upload. File thiếu biến thể tốc độ sẽ hiển thị Warning Icon ⚠️.
- Admin bấm nút render thủ công từng tốc độ. Rendering xong từng cái → upload → giải phóng RAM, tránh render đồng loạt.
- **Garbage Collection**: Gán `null` vào `shallowRef` của Howler instance khi dọn dẹp để tránh Memory Leak trong phiên stream dài.

## Cơ chế Playback & Speed Control

- Mặc định chỉ tải pool biến thể tốc độ đang chọn (không tải tất cả).
- Khi đổi tốc độ chung (Global Speed Selector), hệ thống unload pool cũ và fetch pool biến thể tốc độ mới.
- Audio engine: Howler.js với `html5: false` (Web Audio API mode) để đạt zero-latency trên cached files.
- Pseudo-random: Chọn ngẫu nhiên một variant, loại trừ variant vừa phát cuối cùng (`lastPlayedVariant` ref theo từng script).

## R2 Garbage Collector (Cron Trigger)

Cloudflare Cron Trigger chạy hàng ngày lúc **3:00 UTC** (`0 3 * * *`):

```ts
// apps/api/src/cron.ts
async function cleanOrphanedFiles(db, bucket) {
  // 1. Lấy tất cả r2Key đang có trong DB
  // 2. List tất cả object trong R2 prefix audio/
  // 3. Xóa object nào không có trong DB (bị orphan do upload đứt kết nối)
}
```

## Tài liệu liên quan

- [Architecture](./architecture.md) — Database schema, Data flow
- [Developer Notes](../guide/developer-notes.md) — Lưu ý khi can thiệp vào Player
