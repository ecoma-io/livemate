# Business Model & Pricing

## Mô hình Kinh doanh

LiveMate vận hành theo mô hình **SaaS Freemium** kết hợp **Hybrid Billing** (Thu phí gói cố định + Pay-as-you-go cho tài nguyên thực tế).

- **Target:** Cá nhân livestream (Free/Pro), các Agency quản lý KOC (Agency/Enterprise).
- **Core Value:** Thay thế ekip kỹ thuật bằng tự động hóa âm thanh/kịch bản.
- **Infrastructure Strategy:** **Serverless-First** (Cloudflare Stack) giúp biên lợi nhuận cao nhờ chi phí vận hành cực thấp.

## Cấu trúc Giá

Hệ thống sử dụng cơ chế **Wallet Top-up**. Phí gói hàng tháng được trừ vào ví, phần vượt hạn mức (Storage) tính phí theo ngày hoặc cuối chu kỳ.

| Feature           | **FREE**         | **PRO**                                          | **AGENCY**        | **ENTERPRISE**     |
| :---------------- | :--------------- | :----------------------------------------------- | :---------------- | :----------------- |
| **Giá tháng**     | 0đ               | **49.000đ** (~$2)                                | **79.000đ** (~$3) | **119.000đ** (~$5) |
| **User limit**    | 1 User (Owner)   | Max **5 Users**                                  | Max **12 Users**  | **Unlimited**      |
| **Max File Size** | 1MB              | 2MB                                              | 2MB               | 2MB                |
| **Variants**      | Limited (e.g. 2) | Unlimited                                        | Unlimited         | Unlimited          |
| **Storage Quota** | 50MB (Free)      | 500MB (Included)                                 | 1GB (Included)    | 2GB (Included)     |
| **Pay-as-you-go** | N/A              | **~5.000đ/GB/tháng** cho dung lượng vượt hạn mức |                   |                    |

**Cơ chế Pay-as-you-go:**

- Chỉ tính phí trên **Peak Storage** (Dung lượng lưu trữ cao nhất ghi nhận được trong chu kỳ).
- Tính phí dựa trên **Total Users** nếu vượt quá slot của gói.

## Phân tích Chi phí Vận hành

Vì Rendering được đẩy về Client-side, chi phí Backend gần như bằng 0 ở quy mô nhỏ.

| Dịch vụ              | Chi phí                                             |
| -------------------- | --------------------------------------------------- |
| **CF Workers/Pages** | Miễn phí 100k req/ngày. Gói $5/tháng cho 10M req.   |
| **CF D1**            | Miễn phí đến 5GB dữ liệu.                           |
| **CF R2**            | $0.015/GB/tháng. Miễn phí 10GB đầu. **Egress: 0đ.** |
| **Logto IAM**        | Miễn phí đến 5.000 MAU.                             |
| **Brevo Email**      | Miễn phí 300 emails/ngày.                           |

> Với 1.000 user đầu tiên, chi phí thực tế gần như **0 VNĐ** — vẫn nằm trong Free Tier của Cloudflare.

## Kịch bản Tài chính

_Giả sử tỷ lệ chuyển đổi Free → Paid là 5%._

### Kịch bản A: Quy mô nhỏ — 1.000 Users

- Free Users: 950 | Paid Users: 50 x 49k = **2.450.000đ/tháng**
- Chi phí vận hành: ~0đ (vẫn trong Free Tier)

### Kịch bản B: Quy mô trung bình — 10.000 Users

- Paid Users: ~500 | Doanh thu trung bình: 500 x 70k = **35.000.000đ/tháng**
- Chi phí vận hành: ~1.500.000đ (CF Workers + R2 + Logto Cloud)
- **Lợi nhuận ước tính: ~33.500.000đ/tháng**

### Kịch bản C: Agency-focused — 100 Agency Enterprise

- Doanh thu: 100 x 119k = **11.900.000đ/tháng** với biên lợi nhuận cao.

## Tài liệu liên quan

- [PRD](./prd.md) — Yêu cầu sản phẩm
- [Roadmap](./roadmap.md) — Lộ trình tính năng SaaS (Phase 3)
