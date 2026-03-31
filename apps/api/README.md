# 🧠 Control Plane

**Dự án con (Sub-project):** `apps/control-plane`
**Tech Stack:** NestJS, TypeScript

## 🎯 Vai trò trong kiến trúc

Control Plane đóng vai trò là **Bộ Não Phân Phối (Orchestrator)** trung tâm của hệ sinh thái Side Kick. Đây là một HTTP/WebSocket Server được xây dựng trên NestJS, đóng vai trò kết nối giữa **[Studio](../studio/README.md)** (Giao diện người dùng) và các **[Agents](../agent/README.md)** (Tiến trình thực thi).

## ⚙️ Chức năng cốt lõi

1. **Quản lý dữ liệu (CRUD):** Cung cấp các REST APIs cho Studio để quản lý Workflows, Agents, Logs, Users,...
2. **Điều phối (Orchestration):** Nhận yêu cầu chạy Workflow từ Studio hoặc Lịch chạy tự động (Cron/Triggers).
3. **Giao tiếp Agent:** Quản lý danh sách các trình duyệt (Agents) đang online, phân phát tải (dispatch jobs) tương ứng xuống đúng Agent thông qua WebSockets.
4. **Lưu trữ Log:** Theo dõi và ghi nhận trạng thái từ quá trình Agents thực thi kịch bản trên máy của client.

Dự án này sử dụng chặt chẽ các module được định nghĩa sẵn trong lớp `libs/application` và `libs/domain` theo chuẩn **Domain-Driven Design (DDD)**.
