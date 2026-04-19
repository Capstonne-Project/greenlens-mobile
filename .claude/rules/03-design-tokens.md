---
paths:
  - "src/**/*.{ts,tsx}"
  - "app/**/*.tsx"
---

# Design Tokens & Visual System

## Màu sắc — BẮTBUỘC dùng token, không hard-code hex

```ts
// src/theme/colors.ts
primary:          '#139B40'   // bg-primary / text-primary / border-primary
primaryLight:     '#E8F7ED'   // bg-primary-light
primaryDark:      '#0D7A31'   // bg-primary-dark (pressed state)

background:       '#FFFFFF'   // Nền toàn app — LUÔN là trắng
surface:          '#F7F8FA'   // Card, input background
border:           '#E5E7EB'

textPrimary:      '#111827'
textSecondary:    '#6B7280'
textDisabled:     '#D1D5DB'
textOnPrimary:    '#FFFFFF'   // Chữ trên nền primary

success: '#139B40' | warning: '#F59E0B' | error: '#EF4444' | info: '#3B82F6'

// Mức độ ô nhiễm
severityLow:      '#86EFAC'
severityMedium:   '#FDE047'
severityHigh:     '#FB923C'
severityCritical: '#EF4444'
```

**Dùng Tailwind token:** `bg-primary`, `text-primary`, `border-primary` — KHÔNG dùng `bg-[#139B40]` trong className trừ khi token chưa được định nghĩa.

## Typography

- Font: System (San Francisco trên iOS, Roboto trên Android) — không dùng font custom khi chưa được design approve.
- Scale: `text-xs(12)` · `text-sm(14)` · `text-base(16)` · `text-lg(18)` · `text-xl(20)` · `text-2xl(24)` · `text-3xl(30)`
- Body text mặc định: `text-base text-textPrimary`
- Label/caption: `text-sm text-textSecondary`

## Spacing

- Bội số của **4px**: `p-1(4)` `p-2(8)` `p-3(12)` `p-4(16)` `p-5(20)` `p-6(24)` `p-8(32)`
- Padding màn hình ngang: `px-4` (16px) — áp dụng nhất quán trên mọi screen.
- Padding top content: `pt-4` (16px).

## Border Radius

| Element | Class | Value |
|---|---|---|
| Card | `rounded-2xl` | 16px |
| Button | `rounded-xl` | 12px |
| Input | `rounded-xl` | 12px |
| Badge / Tag | `rounded-full` | — |
| Bottom sheet | `rounded-t-2xl` | 16px top |

## Shadows / Elevation

```tsx
// Card shadow (cross-platform)
shadow-sm        // iOS subtle shadow
elevation-2      // Android
```
