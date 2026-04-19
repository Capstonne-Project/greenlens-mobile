---
paths:
  - "src/services/**/*.ts"
  - "src/stores/**/*.ts"
---

# Service & Store Patterns

## Service Pattern (API Layer)

```ts
// src/services/report.service.ts
import { api } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { ReportItem, CreateReportDto, ReportStatus } from '@/types/report.types';

export const reportService = {
  getAll: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<ReportItem>>('/reports', { params: { page, limit } }),

  getById: (id: string) =>
    api.get<ApiResponse<ReportItem>>(`/reports/${id}`),

  create: (dto: CreateReportDto) =>
    api.post<ApiResponse<ReportItem>>('/reports', dto),

  updateStatus: (id: string, status: ReportStatus) =>
    api.patch<ApiResponse<ReportItem>>(`/reports/${id}/status`, { status }),
};
```

**Quy tắc cứng:**
- Service file **không được chứa** `useState`, `useEffect`, `useCallback` — không có React hook.
- Service file **không được chứa** logic UI hay business logic — chỉ HTTP calls.
- Luôn khai báo **generic type** cho response: `api.get<ApiResponse<T>>`.
- Export dưới dạng **const object** (không phải class).

## Axios Instance (`src/services/api.ts`)

- Base URL lấy từ `process.env.EXPO_PUBLIC_API_URL`.
- Request interceptor: tự động đính `Authorization: Bearer <token>` từ `SecureStore`.
- Response interceptor: xử lý 401 → clear tokens.
- Timeout mặc định: `15000ms`.

## Store Pattern (Zustand)

```ts
// src/stores/auth.store.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tokens: AuthTokens) => Promise<void>;
  clearAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  isAuthenticated: false,

  setAuth: async (user, tokens) => {
    await SecureStore.setItemAsync('accessToken',  tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    set({ user, isAuthenticated: true });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false });
  },
}));
```

**Quy tắc cứng:**
- Store **không gọi API trực tiếp** — action trong store chỉ gọi service, sau đó `set()`.
- State shape phải có **TypeScript interface** rõ ràng.
- Export là `useXxxStore` (custom hook pattern của Zustand).

## Phân chia trách nhiệm

```
UI Component  →  Custom Hook  →  Zustand Store  →  Service (Axios)  →  API
     ↑                ↑               ↑
  render state    React Query    global client state
  local state     server state
```

- **React Query** quản lý server state (cache, refetch, loading/error).
- **Zustand** quản lý global client state (auth, filters, UI state).
- **Component local state** chỉ cho UI-only state (modal open, input focus).

## Security Rules — Service Layer (Bắt buộc)

```ts
// ✅ ĐÚNG — dùng path param, không query param cho sensitive data
api.get(`/users/${userId}/profile`)

// ❌ SAI — sensitive data trong query string (xuất hiện trong logs/analytics)
api.get('/users/profile', { params: { token: accessToken } })

// ✅ ĐÚNG — log an toàn
if (__DEV__) console.log('API response status:', res.status);

// ❌ SAI — log token hay PII
console.log('Token:', accessToken);
console.log('User data:', user);
```

**Checklist service layer:**
- [ ] Tất cả endpoints dùng HTTPS trong production (`EXPO_PUBLIC_API_URL=https://...`)
- [ ] Không có sensitive data trong query params
- [ ] Không `console.log` token, password, PII — dù trong dev
- [ ] Request interceptor đính token từ SecureStore, không hardcode
- [ ] Response interceptor xử lý 401 → clear token + redirect
- [ ] Timeout 15s đã set — không có hanging request

## Performance Rules — Service & Store Layer

```ts
// ✅ React Query staleTime — tránh refetch không cần thiết
useQuery({
  queryKey: ['reports'],
  queryFn: () => reportService.getAll().then(r => r.data),
  staleTime: 5 * 60 * 1000,   // 5 phút — list ít thay đổi
  gcTime: 10 * 60 * 1000,     // giữ cache 10 phút
});

// ✅ Zustand selector — chỉ subscribe field cần thiết
const user = useAuthStore(s => s.user);           // ✅ re-render khi user đổi
const store = useAuthStore();                      // ❌ re-render khi bất kỳ field đổi

// ✅ Optimistic update cho UX nhanh hơn
useMutation({
  mutationFn: reportService.create,
  onMutate: async (newReport) => {
    await qc.cancelQueries({ queryKey: ['reports'] });
    const prev = qc.getQueryData(['reports']);
    qc.setQueryData(['reports'], (old: any) => ({
      ...old,
      data: [newReport, ...(old?.data ?? [])],
    }));
    return { prev };
  },
  onError: (_err, _vars, ctx) => qc.setQueryData(['reports'], ctx?.prev),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
});
```
