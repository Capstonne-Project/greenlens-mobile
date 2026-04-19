---
paths:
  - "src/components/**/*.tsx"
  - "src/hooks/**/*.ts"
---

# Component & Hook Patterns

## Naming Conventions

| Loại | Convention | Ví dụ |
|---|---|---|
| Component file | PascalCase | `ReportCard.tsx` |
| Hook file | camelCase, prefix `use` | `useReports.ts` |
| Store file | camelCase, suffix `.store` | `auth.store.ts` |
| Service file | camelCase, suffix `.service` | `report.service.ts` |
| Type / Interface | PascalCase | `ReportItem`, `ApiResponse<T>` |
| Constant | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE` |

## Component Pattern

```tsx
// Named export — không dùng default export cho components
// Props interface bắt buộc — không dùng `any`
interface ReportCardProps {
  report: ReportItem;
  onPress: () => void;
  index?: number;       // cho stagger animation
}

export function ReportCard({ report, onPress, index = 0 }: ReportCardProps) {
  // animation logic ở đây nếu cần
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl border border-border p-4"
    >
      {/* content */}
    </Pressable>
  );
}
```

**Quy tắc:**
- Dùng **named export** (`export function Foo`) — không dùng `export default` cho components trong `src/`.
- Screens trong `app/` dùng `export default` (Expo Router yêu cầu).
- Props **bắt buộc có TypeScript interface** — không dùng `any`, không dùng inline type.
- Không đặt logic fetch data trong component — tách ra `src/hooks/`.

## Hook Pattern

```ts
// src/hooks/useReports.ts
export function useReports() {
  const { filters } = useReportStore();

  const query = useQuery({
    queryKey: ['reports', filters],
    queryFn:  () => reportService.getAll().then(r => r.data.data),
  });

  return {
    reports:   query.data ?? [],
    isLoading: query.isLoading,
    error:     query.error,
    refetch:   query.refetch,
  };
}
```

**Quy tắc:**
- Hook trả về object (không trả về array trừ `useState`-style pairs).
- Không fetch trực tiếp trong component — luôn qua hook.
- Hook không chứa JSX.

## Import Alias

Dùng `@/` (trỏ đến `src/`) cho mọi import sâu hơn 2 cấp:

```ts
import { Button }        from '@/components/common/Button';
import { useAuthStore }  from '@/stores/auth.store';
import { colors }        from '@/theme/colors';
import { reportService } from '@/services/report.service';
```

## TypeScript Conventions

- Dùng `interface` cho object shapes, `type` cho unions/aliases.
- Không dùng `React.FC` — khai báo kiểu trực tiếp qua interface props.
- Không dùng `as any` — nếu cần cast, dùng `as unknown as T` và ghi chú WHY.
- Enum: dùng `const` object + `keyof typeof` thay vì TypeScript `enum`.

## Performance — Component Level

```tsx
// ✅ Memoize list item components — tránh re-render khi scroll
export const ReportCard = React.memo(function ReportCard({ report, onPress }: Props) {
  // ...
});

// ✅ useCallback cho handlers truyền vào list items
const handlePress = useCallback((id: string) => {
  router.push(`/report/${id}`);
}, []); // stable reference

// ✅ useMemo cho expensive computation
const sortedItems = useMemo(
  () => items.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [items]
);

// ❌ SAI — function mới mỗi render = FlatList re-render toàn bộ
<FlatList renderItem={({ item }) => <ReportCard ... />} /> // arrow function inline
```

## Security — Component Level

- **Không log user data**: Không `console.log(user)`, `console.log(formData)`, `console.log(token)` trong component
- **Error display**: Dùng generic message cho user — không hiện `error.message` trực tiếp từ API response
- **Input sanitize**: Mọi `<TextInput>` trong form phải có Zod field trong schema tương ứng
- **Sensitive props**: Không truyền token/password qua props — dùng SecureStore trực tiếp trong service

```tsx
// ✅ Generic error message — không expose server internals
{error && <Text className="text-error text-sm">Đã xảy ra lỗi. Vui lòng thử lại.</Text>}

// ❌ SAI — expose server error detail
{error && <Text>{error.response?.data?.message}</Text>}
```
