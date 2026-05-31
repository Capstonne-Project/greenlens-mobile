# Cleanup Team UI — Tiến độ

> Cập nhật lần cuối: 2026-05-18

App có 3 role: **Citizen** (done), **CleanupTeam** (đang build), **Inspector** (chưa làm).  
Sau login với role Cleanup → redirect `/(staff)/home`.  
BE trả về role string `'Cleanup'` (không phải `'CleanupTeam'`) — đã normalize trong `src/utils/mobile-user.ts`.

---

## ĐÃ XONG

### Types & Services
| File | Nội dung |
|------|----------|
| `src/types/cleanup-assignment.types.ts` | `AssignmentStatus`, `AssignmentItem`, `ReportDetail`, `ReportAssignment`, tất cả DTOs |
| `src/types/user.types.ts` | Thêm `teamId?: string`, `teamName?: string` vào `User` |
| `src/services/cleanupAssignment.service.ts` | 7 methods (xem bên dưới) |

**7 service methods đã có:**
- `getMyAssignments` → `GET /v1/reports/my-assignments`
- `getReportDetail` → `GET /v1/reports/{id}`
- `accept` → `PUT /v1/reports/{id}/accept`
- `decline` → `PUT /v1/reports/{id}/decline`
- `uploadProgressImage` → `POST /v1/reports/{id}/progress/images` (multipart)
- `updateProgress` → `PUT /v1/reports/{id}/progress`
- `resolve` → `PUT /v1/reports/{id}/resolve`

### Hooks
- `src/hooks/useMyAssignments.ts` — fetch assignments, filter by status
- `src/hooks/useStaffMapPins.ts` — convert `AssignmentItem[]` → `StaffMapPin[]`

### Components
- `src/components/layout/StaffTabBar.tsx` — bottom tab 5 tab
- `src/components/map/StaffMapPinMarker.tsx` — marker với severity icon + `stopPropagation`
- `src/components/map/StaffMapCalloutCard.tsx` — card khi tap marker trên map

### Screens
| File | Mô tả |
|------|-------|
| `app/(staff)/_layout.tsx` | Tabs + StaffTabBar |
| `app/(staff)/home.tsx` | Dashboard: urgent banner, stats 2×3, mini map, officer feed |
| `app/(staff)/map.tsx` | Full-screen map + callout card khi tap pin |
| `app/(staff)/assignments.tsx` | List task: filter tabs, skeleton, cards |
| `app/(staff)/notifications.tsx` | Placeholder |
| `app/(staff)/members.tsx` | Placeholder (hiện teamName) |
| `app/(staff)/settings.tsx` | Profile + logout |
| `app/assignment/[id].tsx` | Detail: hero image, timeline 4 bước, action bar theo status |
| `app/assignment/decline.tsx` | Từ chối: countdown 2h, radio reasons, submit API |

---

## CÒN THIẾU

### 1. Accept assignment
- **Vị trí:** nút "Nhận nhiệm vụ" trong `app/assignment/[id].tsx` — hiện chưa nối API
- **Cần làm:** gọi `accept(reportId, { teamId })` → toast/alert success → reload detail
- **Endpoint:** `PUT /v1/reports/{id}/accept` body `{ teamId }`

### 2. Upload ảnh tiến độ (InProgress)
- **Vị trí:** nút "Cập nhật ảnh" trong `app/assignment/[id].tsx`
- **Cần làm:** mở image picker → upload multipart → lưu URL trả về
- **Endpoint:** `POST /v1/reports/{id}/progress/images` multipart `{ teamId, image }`

### 3. Cập nhật % tiến độ (InProgress)
- **Chưa có UI nào**
- **Cần làm:** bottom sheet hoặc modal nhập `progressPercent` + `progressNote`
- **Endpoint:** `PUT /v1/reports/{id}/progress` body `{ teamId, progressPercent, progressNote }`

### 4. Resolve — Hoàn thành
- **Vị trí:** nút "Hoàn thành" trong `app/assignment/[id].tsx`
- **Cần làm:** collect ≥2 after-image URLs (upload trước) → submit resolve
- **Endpoint:** `PUT /v1/reports/{id}/resolve` body `{ teamId, afterImageUrls[] }`

### 5. Pull-to-refresh sau action
- Sau accept/decline/resolve → reload assignment list + detail

### 6. Notifications screen
- Hiện là placeholder, chưa có API notifications cho CleanupTeam

### 7. Members screen
- Hiện là placeholder, chưa có API list team members

---

## Ghi chú kỹ thuật quan trọng

| Vấn đề | Giải pháp |
|--------|-----------|
| Logo có nhiều whitespace | `width:200, height:200, marginLeft:-40, marginTop:-80, marginBottom:-80` |
| Map marker bị clear ngay sau tap | `<Marker stopPropagation>` — thiếu prop này MapView `onPress` clear `selectedPin` |
| BE role string khác app | BE trả `'Cleanup'`, normalize thành `'CleanupTeam'` trong `mobile-user.ts` |
| `teamId` lấy từ đâu | `useAuthStore(s => s.user?.teamId)` — truyền vào tất cả mutation DTOs |
| Không có React Query | Project dùng `useState/useEffect` pattern thuần trong hooks |
| `width %` trong RN style | Cast `` `${n}%` as `${number}%` `` để tránh TS error `DimensionValue` |
