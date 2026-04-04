# Product Requirement Document (PRD)

## Mục tiêu

Xây dựng một công cụ tinh gọn giúp host live stream bấm nút để phát các đoạn audio thoại được thu âm sẵn. Hệ thống tự động chọn ngẫu nhiên một trong các phiên bản thoại khác nhau (Variants) để máy học của nền tảng không phát hiện sự lặp đi lặp lại.

## Core Features (MVP)

| Feature                             | Mô tả                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| **Zero-latency Playback**           | Bấm là phát ngay lập tức, không có độ trễ tải file                                           |
| **Pseudo-random Variant Selection** | Chọn ngẫu nhiên file trong nhóm kịch bản, loại trừ file vừa phát cuối cùng                   |
| **Playback Speed Control & Stop**   | Hỗ trợ tốc độ 1.0x, 1.1x, 1.2x, 1.3x, 1.4x, 1.5x chọn toàn cục (Global) và Nút Dừng Khẩn Cấp |
| **Offline Cache Management**        | Tải ngầm file thông qua Service Worker và Cache API, phát offline mượt mà                    |
| **Kịch bản & Màu sắc**              | Kéo thả sắp xếp nhóm kịch bản, gán màu sắc nhận diện để tạo thói quen cơ tay                 |
| **OOM Prevention**                  | Giới hạn file <2MB, Admin tự kích hoạt render thủ công từng biến thể tốc độ                  |

## Tài liệu liên quan

- [Roadmap](./roadmap.md) — Tiến độ phát triển theo từng phase
- [Business Model](./business-model.md) — Mô hình kinh doanh và pricing
- [Architecture](../technical/architecture.md) — Thiết kế hệ thống
