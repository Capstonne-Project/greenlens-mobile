---
name: feature
description: Scaffold toàn bộ một feature mới cho GreenLens từ A đến Z — TypeScript types, Axios service, Zustand store, React Query hook, UI components, và screen. Dùng skill này khi bắt đầu implement một tính năng hoàn toàn mới như: authentication, report creation, map view, notifications, leaderboard, profile. Nếu chỉ cần component đơn lẻ → dùng /component; chỉ cần screen → dùng /screen.
argument-hint: <FeatureName>
---

Scaffold feature `$ARGUMENTS` cho GreenLens.

## Thứ tự tạo file (PHẢI theo đúng thứ tự này)

```
1. src/types/$ARGUMENTS.types.ts      ← TypeScript types trước
2. src/services/$ARGUMENTS.service.ts ← API layer
3. src/stores/$ARGUMENTS.store.ts     ← Zustand (chỉ nếu cần global state)
4. src/hooks/use$ARGUMENTS.ts         ← React Query hooks
5. src/components/$ARGUMENTS/         ← UI components
6. app/.../$ARGUMENTS.tsx             ← Screen(s)
```

---

## Layer 1 — Types (`src/types/$ARGUMENTS.types.ts`)

```ts
// Union types trước
export type $ArgumentsStatus = 'pending' | 'active' | 'resolved';

// Entity interface
export interface $ArgumentsItem {
  id: string;
  // ... fields từ API contract
  createdAt: string;
  updatedAt: string;
}

// DTO cho create/update (chỉ fields gửi lên)
export interface Create$ArgumentsDto {
  // ...
}

export interface Update$ArgumentsDto {
  // ...
}
```

## Layer 1.5 — Validation Schemas (`src/utils/validators/$ARGUMENTS.schema.ts`)

```ts
import { z } from 'zod';

// Create schemas — dùng cho React Hook Form + pre-API validation
export const create$ArgumentsSchema = z.object({
  title:       z.string().min(5, 'Tối thiểu 5 ký tự').max(100).trim(),
  description: z.string().min(10).max(1000).trim(),
  // location fields
  latitude:    z.number().min(-90).max(90),
  longitude:   z.number().min(-180).max(180),
});

export type Create$ArgumentsInput = z.infer<typeof create$ArgumentsSchema>;
// Note: Create$ArgumentsInput ≈ Create$ArgumentsDto nhưng validated
```

**Quy tắc:**
- Mọi DTO có form tương ứng → phải có Zod schema
- String fields: luôn có `.trim()` và `.max()` — ngăn overflow
- Numeric fields: luôn có `.min()` / `.max()` range check
- File upload fields: validate `mimeType` và `fileSize` trong schema

## Layer 2 — Service (`src/services/$ARGUMENTS.service.ts`)

```ts
import { api } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { $ArgumentsItem, Create$ArgumentsDto } from '@/types/$ARGUMENTS.types';

export const $ArgumentsService = {
  getAll:       (page = 1, limit = 20) =>
    api.get<PaginatedResponse<$ArgumentsItem>>('/$ARGUMENTS', { params: { page, limit } }),
  getById:      (id: string) =>
    api.get<ApiResponse<$ArgumentsItem>>(`/$ARGUMENTS/${id}`),
  create:       (dto: Create$ArgumentsDto) =>
    api.post<ApiResponse<$ArgumentsItem>>('/$ARGUMENTS', dto),
  update:       (id: string, dto: Partial<Create$ArgumentsDto>) =>
    api.patch<ApiResponse<$ArgumentsItem>>(`/$ARGUMENTS/${id}`, dto),
  delete:       (id: string) =>
    api.delete<ApiResponse<null>>(`/$ARGUMENTS/${id}`),
};
```

## Layer 3 — Store (`src/stores/$ARGUMENTS.store.ts`) — CHỈ tạo nếu cần global state

```ts
import { create } from 'zustand';

interface $ArgumentsState {
  // chỉ state cần share globally
  selected$Arguments: $ArgumentsItem | null;
  setSelected: (item: $ArgumentsItem | null) => void;
}

export const use$ArgumentsStore = create<$ArgumentsState>((set) => ({
  selected$Arguments: null,
  setSelected: (item) => set({ selected$Arguments: item }),
}));
```

Bỏ qua store nếu state chỉ cần trong 1 màn hình — dùng local state.

## Layer 4 — Hooks (`src/hooks/use$Arguments.ts`)

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { $ArgumentsService } from '@/services/$ARGUMENTS.service';

const QUERY_KEY = ['$ARGUMENTS'] as const;

export function use$ArgumentsList() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn:  () => $ArgumentsService.getAll().then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function use$ArgumentsDetail(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn:  () => $ArgumentsService.getById(id).then(r => r.data.data),
    enabled:  !!id,
  });
}

export function useCreate$Arguments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: $ArgumentsService.create,
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
```

## Layer 5 — Components (`src/components/$ARGUMENTS/`)

Tạo ít nhất:
- `$ArgumentsCard.tsx` — list item card
- `$ArgumentsForm.tsx` — create/edit form (nếu có)
- `$ArgumentsSkeleton.tsx` — loading skeleton

## Layer 6 — Screens

Tạo screen files cần thiết trong `app/`.

---

## Checklist sau khi scaffold xong

- [ ] Types file có đủ entity interface + DTO types
- [ ] Service không có React code
- [ ] queryKey dùng const array, nhất quán
- [ ] Hook trả về object
- [ ] Mỗi component có props interface
- [ ] Screen dùng `export default` và wrap `SafeScreen`
- [ ] List screen có skeleton + empty + error state

**Security:**
- [ ] Zod schema tạo cho mọi create/update form
- [ ] Service không log sensitive data (`console.log` chỉ trong `if (__DEV__)`)
- [ ] Error từ API không expose trực tiếp ra UI

**Performance:**
- [ ] List component dùng `React.memo`
- [ ] Handlers trong list items dùng `useCallback`
- [ ] Query có `staleTime` set
- [ ] FlatList có `removeClippedSubviews` + `maxToRenderPerBatch`

Sau khi tạo, in ra danh sách file đã tạo và việc còn cần làm (API endpoint chưa có, v.v.).
