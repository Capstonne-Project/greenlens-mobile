---
paths:
  - "**/*.tsx"
---

# Styling — NativeWind v4

## Setup

- `global.css` import trong `app/_layout.tsx` — bắt buộc, NativeWind không hoạt động nếu thiếu.
- `babel.config.js`: `jsxImportSource: 'nativewind'` + plugin `'nativewind/babel'`.
- `metro.config.js`: wrap với `withNativeWind(config, { input: './global.css' })`.
- `nativewind-env.d.ts`: `/// <reference types="nativewind/types" />` — fix TypeScript `className` error.

## Quy tắc sử dụng className

**Dùng Tailwind token thay vì hard-code:**

```tsx
// ĐÚNG
<View className="bg-primary px-4 rounded-xl" />
<Text className="text-textPrimary text-base font-semibold" />

// SAI — hard-code hex
<View className="bg-[#139B40] px-4 rounded-xl" />
```

Được phép dùng arbitrary value `[...]` khi token chưa được định nghĩa trong `tailwind.config.js`.

**Conditional className:**

```tsx
// Dùng template literal — KHÔNG dùng thư viện clsx/cn khi không cần thiết
className={`rounded-xl px-4 ${isActive ? 'bg-primary' : 'bg-surface'}`}

// Nếu logic phức tạp (>3 điều kiện), tách ra biến
const containerClass = [
  'rounded-xl px-4',
  isActive   && 'bg-primary',
  isDisabled && 'opacity-40',
].filter(Boolean).join(' ');
```

**Khi nào dùng `StyleSheet` thay className:**
- Animated styles từ `useAnimatedStyle` — bắt buộc dùng `StyleSheet` hoặc inline object.
- Shadow phức tạp cross-platform.
- Style cần tính toán động (width/height phần trăm theo layout).

## Custom Colors trong Tailwind

```js
// tailwind.config.js — các token đã được định nghĩa
primary / primary-light / primary-dark
// Dùng: bg-primary, text-primary-light, border-primary-dark
```

Thêm token mới vào `tailwind.config.js` trước khi dùng trong className.

## Responsive & Platform

```tsx
import { Platform } from 'react-native';

// Platform-specific style
const shadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  android: { elevation: 3 },
});
```

NativeWind không hỗ trợ responsive breakpoints (`sm:`, `md:`, `lg:`) trên native — chỉ dùng được trên web target.
