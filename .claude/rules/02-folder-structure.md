# Folder Structure Rules

## Cấu trúc bắt buộc

```
green-lens-app/
├── app/                    # Expo Router — CHỈ screens & layouts
│   ├── (auth)/             # _layout, login, register, forgot-password
│   ├── (tabs)/             # _layout, index, map, report, notifications, profile
│   ├── report/[id].tsx
│   ├── _layout.tsx         # Root layout (providers)
│   └── +not-found.tsx
├── src/
│   ├── components/
│   │   ├── common/         # Button, Input, Card, Badge, Modal (không phụ thuộc domain)
│   │   ├── report/         # ReportCard, ReportForm, SeverityBadge
│   │   ├── map/            # MapMarker, ClusterMarker, MapFilter
│   │   └── layout/         # AppHeader, BottomSheet, SafeScreen
│   ├── hooks/              # useAuth, useLocation, useReports, useCamera
│   ├── services/           # api.ts + *.service.ts — thuần API call
│   ├── stores/             # *.store.ts — Zustand global state
│   ├── types/              # *.types.ts — TypeScript interfaces
│   ├── utils/              # formatters, validators, geo, permissions
│   └── theme/              # colors.ts, typography.ts, spacing.ts
├── assets/
│   ├── fonts/
│   ├── icons/
│   └── images/
├── global.css              # NativeWind entry point
├── babel.config.js
├── metro.config.js
└── nativewind-env.d.ts
```

## Quy tắc cứng — KHÔNG được vi phạm

- `app/` **chỉ** chứa file routing Expo Router. Không đặt component, hook, store ở đây.
- `src/services/` chứa **thuần API call** — không có `useState`, `useEffect`, không có logic UI.
- `src/stores/` **không gọi API trực tiếp** — chỉ gọi qua `src/services/`.
- `src/components/common/` chỉ chứa component **không phụ thuộc domain** (dùng được ở mọi nơi).
- Mỗi component **1 file `.tsx`** — không gộp nhiều component export vào 1 file nếu chúng được dùng độc lập.
- Import alias `@/` trỏ đến `./src/` — dùng cho mọi import sâu hơn 2 cấp.

## Khi tạo màn hình mới

1. Tạo file screen trong `app/`
2. Tạo component UI chính trong `src/components/<domain>/`
3. Tạo hook fetch data trong `src/hooks/`
4. Tạo service call trong `src/services/` nếu chưa có
