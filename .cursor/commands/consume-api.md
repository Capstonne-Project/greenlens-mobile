---
description: Đọc BE handoff document (.md) và tự generate TypeScript types, Axios service, React Query hooks theo đúng cấu trúc GreenLens.
argument-hint: [đường dẫn file handoff .md | bỏ trống = lấy file mới nhất trong docs/]
---

# /consume-api — Generate FE API Layer từ BE Handoff

Đọc file handoff BE và tạo tự động 3 layer theo đúng thứ tự của GreenLens:
`src/types/` → `src/services/` → `src/hooks/`

**Input:** `$ARGUMENTS`

---

## Bước 0 — Tìm file handoff

| Input | Hành động |
|---|---|
| Blank | Tìm file `.md` mới nhất trong `docs/` hoặc `docs/handoff/` |
| Đường dẫn | Dùng file đó trực tiếp |

Đọc file và extract:
- **Tên feature** (từ heading `# FE Handoff: {title}`)
- **Endpoints**: `{ method, path, auth }`
- **Request body / query params** với types
- **Response `data` shape**
- **Error codes** cần handle

---

## Bước 1 — TypeScript Types (`src/types/{feature}.types.ts`)

```ts
// src/types/report.types.ts

// Union status/enum types TRƯỚC
export type ReportStatus = 'pending' | 'processing' | 'resolved' | 'rejected';

// Entity chính — map 1:1 với response data từ BE
export interface ReportItem {
  id: string;
  title: string;
  // ... fields từ response shape
  createdAt: string;
  updatedAt: string;
}

// DTO — chỉ fields gửi lên trong body (không lặp lại id, timestamps)
export interface CreateReportDto {
  title: string;
  description: string;
  // ...
}

export interface UpdateReportDto {
  // partial fields cho PATCH
}
```

**Quy tắc:**
- File đặt tên `{feature}.types.ts` — không phải `{feature}.ts` hay `{feature}.model.ts`
- Dùng `?` cho optional fields theo contract
- Không import gì từ React hay lib khác — types thuần TypeScript

---

## Bước 2 — API Service (`src/services/{feature}.service.ts`)

```ts
// src/services/report.service.ts
import { api } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { ReportItem, CreateReportDto, UpdateReportDto } from '@/types/report.types';

export const reportService = {
  getAll: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<ReportItem>>('/reports', { params: { page, limit } }),

  getById: (id: string) =>
    api.get<ApiResponse<ReportItem>>(`/reports/${id}`),

  create: (dto: CreateReportDto) =>
    api.post<ApiResponse<ReportItem>>('/reports', dto),

  update: (id: string, dto: UpdateReportDto) =>
    api.patch<ApiResponse<ReportItem>>(`/reports/${id}`, dto),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/reports/${id}`),
};
```

**Quy tắc:**
- Import `api` từ `'./api'` — KHÔNG dùng `apiClient` hay `fetch`
- Export là **const object** — KHÔNG phải class, KHÔNG phải individual functions
- Luôn khai báo generic type cho response: `api.get<ApiResponse<T>>`
- **Không có** `useState`, `useEffect`, `useCallback` — thuần HTTP calls
- Wrap paginatable endpoints với `PaginatedResponse<T>`, còn lại `ApiResponse<T>`

---

## Bước 3 — React Query Hooks (`src/hooks/use{Feature}.ts`)

```ts
// src/hooks/useReports.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '@/services/report.service';
import type { CreateReportDto } from '@/types/report.types';

const QUERY_KEY = ['reports'] as const;

export function useReportList(page = 1) {
  return useQuery({
    queryKey: [...QUERY_KEY, { page }],
    queryFn: () => reportService.getAll(page).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useReportDetail(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => reportService.getById(id).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateReportDto) => reportService.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
```

**Quy tắc:**
- File: `src/hooks/use{Feature}.ts` — KHÔNG phải `src/hooks/api/`
- `QUERY_KEY` dùng `as const` array — nhất quán trong cả file
- `staleTime: 5 * 60 * 1000` mặc định cho list queries
- `enabled: !!id` cho detail query khi id có thể undefined
- Hook trả về object trực tiếp từ `useQuery`/`useMutation`

---

## Zustand Store (CHỈ tạo nếu cần global client state)

Nếu feature có state cần share globally (ví dụ: selected item, filters), tạo `src/stores/{feature}.store.ts`.
Nếu state chỉ dùng trong 1 màn hình → **bỏ qua**, dùng local state.

---

## Bước 4 — Summary

In ra danh sách files đã tạo:

```
✅ Consumed: {Feature Name}

📁 Files generated:
  src/types/{feature}.types.ts     — TypeScript interfaces
  src/services/{feature}.service.ts — Axios service (const object)
  src/hooks/use{Feature}.ts         — React Query hooks

⚠️  Việc còn lại:
  - Verify endpoint paths với BE team
  - Kiểm tra ApiResponse / PaginatedResponse shape khớp với response thực tế
  - [Nếu có auth endpoint] kiểm tra SecureStore integration
```
