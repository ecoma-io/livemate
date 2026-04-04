# UI Design Guidance

## Theme & Primary Color

Hệ thống sử dụng **Electric Purple** (`#8b5cf6`) làm màu chủ đạo, đồng bộ từ thiết kế Logo (phát sóng radio) đến bộ theme PrimeVue.

PWA manifest:

- `theme_color`: `#8b5cf6`
- `background_color`: `#09090b`

## Bảng màu Primary

| Token     | Hex                         |
| --------- | --------------------------- |
| `50`      | `#f5f3ff`                   |
| `100`     | `#ede9fe`                   |
| `200`     | `#ddd6fe`                   |
| `300`     | `#c4b5fd`                   |
| `400`     | `#a78bfa`                   |
| **`500`** | **`#8b5cf6`** ← Base / Logo |
| `600`     | `#7c3aed`                   |
| `700`     | `#6d28d9`                   |
| `800`     | `#5b21b6`                   |
| `900`     | `#4c1d95`                   |
| `950`     | `#2e1065`                   |

## Design System

- **PrimeVue** với **Aura Preset** — components chính của Admin, đồng bộ với bảng màu trên.
- **TailwindCSS v4** — layout, responsive, utility classes. Tích hợp qua `@tailwindcss/vite` plugin và `tailwindcss-primeui` để đồng bộ token màu với PrimeVue.

## Mục tiêu UX

Giao diện cần đảm bảo:

- Nổi bật, dễ nhận diện màu sắc kịch bản khi phát live trong điều kiện ánh sáng yếu hoặc screen size nhỏ.
- Không mỏi mắt khi sử dụng liên tục trong phiên livestream dài (dark background `#09090b`).
- Responsive trên Mobile/Tablet cho Player (host thường dùng điện thoại khi live).
