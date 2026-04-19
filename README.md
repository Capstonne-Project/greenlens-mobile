# GreenLens — Ứng dụng cộng đồng báo cáo ô nhiễm môi trường

**Mã dự án:** SU26SE049  
**Nền tảng:** React Native (Expo) · Android & iOS  
**Màu chủ đạo:** `#139B40`

---

## Giới thiệu

GreenLens là ứng dụng cộng đồng cho phép người dùng báo cáo các điểm rác thải và ô nhiễm môi trường theo thời gian thực. Dữ liệu được hiển thị trên bản đồ, giúp cơ quan quản lý nắm bắt và xử lý kịp thời.

**Lĩnh vực:** Quản lý môi trường · Crowdsourcing · Smart City  
**Quy mô mục tiêu:** ≥ 5.000 người dùng đồng thời · ≥ 100.000 báo cáo

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router v6 |
| Styling | NativeWind v4 (Tailwind CSS) |
| Language | TypeScript (strict) |
| State | Zustand + React Query |
| Animation | react-native-reanimated v4 |
| HTTP | Axios |
| Forms | React Hook Form + Zod |

---

## Cài đặt & Chạy

```bash
# Cài dependencies
npm install

# Chạy dev (chọn platform trong terminal)
npx expo start

# Android
npx expo start --android

# iOS
npx expo start --ios
```

---

## Cấu trúc thư mục

```
green-lens-app/
├── app/          # Expo Router — screens & layouts
│   ├── (auth)/   # Login, Register, Forgot password
│   ├── (tabs)/   # Home, Map, Report, Notifications, Profile
│   └── report/   # Chi tiết báo cáo
├── src/
│   ├── components/   # common / report / map / layout
│   ├── hooks/        # Custom hooks
│   ├── services/     # API layer (Axios)
│   ├── stores/       # Zustand stores
│   ├── types/        # TypeScript types
│   ├── utils/        # Formatters, validators, geo
│   └── theme/        # Colors, typography, spacing
├── assets/           # Fonts, icons, images
├── global.css        # NativeWind entry point
├── babel.config.js
├── metro.config.js
└── CLAUDE.md         # Quy ước dự án (đọc trước khi code)
```

---

## Tính năng chính

**Người dùng:**
- Đăng ký / Đăng nhập
- Tạo báo cáo điểm ô nhiễm (ảnh, GPS, mức độ)
- Xem bản đồ điểm ô nhiễm xung quanh
- Theo dõi trạng thái báo cáo
- Nhận thông báo khi báo cáo được xử lý
- Bảng xếp hạng đóng góp cộng đồng

**Quản lý (Web Dashboard):**
- Xem & phân công xử lý báo cáo
- Cập nhật trạng thái
- Thống kê theo khu vực / thời gian

---

## Quy ước dự án

Xem [CLAUDE.md](./CLAUDE.md) để biết đầy đủ về design system, cấu trúc thư mục, naming convention và quy tắc animation.
