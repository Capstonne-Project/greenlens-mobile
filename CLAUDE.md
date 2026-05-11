# GreenLens — CLAUDE.md

Dự án **SU26SE049** · React Native (Expo) · Android & iOS  
Primary color: `#10B981` · Background: `#FFFFFF`

## Rules

Chi tiết được tách vào `.claude/rules/`:

| File | Nội dung | Khi nào load |
|---|---|---|
| [01-project-overview](./claude/rules/01-project-overview.md) | Tech stack, commands, feature checklist | Luôn luôn |
| [02-folder-structure](./claude/rules/02-folder-structure.md) | Cấu trúc thư mục, quy tắc đặt file | Luôn luôn |
| [03-design-tokens](./claude/rules/03-design-tokens.md) | Colors, typography, spacing, border radius | Khi mở `src/**` hoặc `app/**` |
| [04-ux-and-animation](./claude/rules/04-ux-and-animation.md) | UX principles, haptics, Reanimated patterns | Khi mở component/screen |
| [05-component-patterns](./claude/rules/05-component-patterns.md) | Component, hook patterns, naming, TypeScript | Khi mở `src/components/**` |
| [06-service-store-patterns](./claude/rules/06-service-store-patterns.md) | Service (Axios), Zustand store patterns | Khi mở `src/services/**` hoặc `src/stores/**` |
| [07-styling-nativewind](./claude/rules/07-styling-nativewind.md) | NativeWind setup, className rules | Khi mở bất kỳ `.tsx` |

## Quy tắc cốt lõi (luôn áp dụng)

1. Đặt file **đúng vị trí** theo `02-folder-structure` — không đặt sai layer.
2. Dùng màu **`bg-primary` / `text-primary`** — không hard-code `#10B981` trong className.
3. Mọi **Pressable phải có animation press** — dùng `react-native-reanimated`.
4. Mọi **list phải có skeleton loader** khi fetch — không dùng spinner đơn thuần.
5. **Không dùng `Animated` API cũ** — chỉ dùng `react-native-reanimated`.
6. **Không thêm thư viện mới** mà không thông báo lý do.
7. Component phải có **TypeScript interface** cho props — không dùng `any`.
