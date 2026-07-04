# Company Staff — API Guide (Mobile / FE)

> **Role:** `CompanyStaff` — nhân viên hiện trường thuộc **đội công ty** (company cleanup team).  
> **Prefix:** `/v1` · **Envelope:** `{ code, message, status, data }`  
> **Luồng:** CM phân công team → Staff nhận việc → cập nhật tiến độ → hoàn thành (resolve).  
> **Tham chiếu:** [`REPORT_LIFECYCLE.md`](./REPORT_LIFECYCLE.md), [`cleaner-progress-resolve-fe-guide.md`](./cleaner-progress-resolve-fe-guide.md), [`MOBILE_AUTH_INTEGRATION.md`](./MOBILE_AUTH_INTEGRATION.md)

---

## 1. Vai trò & phạm vi

| Khái niệm | Mô tả |
|-----------|--------|
| **CompanyStaff** | User thuộc công ty DVMT, được CM add vào `company_staff` + (tuỳ chọn) `team_members` |
| **Company team** | `EnvironmentalTeam` có `companyId` — CM tạo qua `/v1/teams/company-teams` |
| **Assignment** | Bản ghi `ReportAssignment` — CM giao report cho team (`POST /reports/{id}/assign-company-team`) |

**CompanyStaff dùng chung API field worker với `Cleaner`** (đội cộng đồng) qua `TeamsController`.  
**Không** dùng API của `CompanyManager` (`company-queue`, `company-assignments`, …).

---

## 2. Ai làm được gì? (Member vs Team Leader)

| Tác vụ | Thành viên thường | Team Leader (`isLeader: true`) |
|--------|-------------------|--------------------------------|
| Xem profile team | ✅ | ✅ |
| Xem danh sách task | ✅ | ✅ |P
| Xem chi tiết task | ✅ | ✅ |
| Chấp nhận task (`accept`) | ❌ | ✅ |
| Từ chối task (`decline`) | ❌ | ✅ (trong 2h, lý do ≥ 20 ký tự) |
| Cập nhật tiến độ (`progress`) | ❌ | ✅ |
| Hoàn thành (`resolve`) | ❌ | ✅ |
| Xem lịch sử tiến độ team | ❌ | ✅ |

Handler kiểm tra leader qua `team_members.is_leader` — **không** dựa vào role JWT ngoài việc phải là `CompanyStaff`.

---

## 3. Lifecycle assignment (góc nhìn Staff)

```
CM assign team     →  AssignmentStatus: Assigned   (Report: InProgress)
Team leader accept →  AssignmentStatus: InProgress
Leader progress    →  vẫn InProgress (chỉ đổi % + ảnh)
Leader resolve     →  AssignmentStatus: Completed
                     (khi mọi team xong → Report: Resolved)
```

**Xem detail khi `Assigned`:** được — response có `canDecline: true`, `canUpdateProgress/resolve: false`.

---

## 4. Auth

### Login

```http
POST /v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "staff@greenlens.dev",
  "password": "Lualua123@"
}
```

**Response `data.user.role`:** `"CompanyStaff"` (PascalCase).

**Lần đầu sau khi CM tạo account:** `mustChangePassword: true` → gọi `POST /v1/auth/change-password`.

### Headers mọi request

```http
Authorization: Bearer {accessToken}
Accept-Language: vi-VN
Content-Type: application/json
```

Chi tiết refresh token, logout: [`MOBILE_AUTH_INTEGRATION.md`](./MOBILE_AUTH_INTEGRATION.md).

### Seed QA (Development)

| Email | Password | Ghi chú |
|-------|----------|---------|
| `staff@greenlens.dev` | `Lualua123@` | Team leader demo, task `REP-MOB-TSK001` |

Xem thêm: [`SEED_ACCOUNTS.md`](./SEED_ACCOUNTS.md).

---

## 5. Bảng endpoint — CompanyStaff được gọi

### 5.1 Task workflow (chính)

| # | Method | Path | Leader? | Mô tả |
|---|--------|------|---------|--------|
| 1 | GET | `/v1/teams/my-profile` | — | Profile team + danh sách member |
| 2 | GET | `/v1/teams/my-tasks` | — | Danh sách task của team |
| 3 | GET | `/v1/teams/my-tasks/{reportId}` | — | Chi tiết task (**path = reportId**) |
| 4 | PUT | `/v1/teams/my-tasks/{reportId}/accept` | ✅ | Chấp nhận task |
| 5 | PUT | `/v1/teams/my-tasks/{reportId}/decline` | ✅ | Từ chối task |
| 6 | GET | `/v1/teams/my-progress` | ✅ | Lịch sử tiến độ team |
| 7 | PUT | `/v1/reports/{reportId}/progress` | ✅ | Cập nhật % + ảnh (multipart) |
| 8 | PUT | `/v1/reports/{reportId}/resolve` | ✅ | Hoàn thành + ảnh after |

### 5.2 Hỗ trợ / read-only

| Method | Path | Ghi chú |
|--------|------|---------|
| GET | `/v1/users/profile` | Profile user (không có `/users/me`) |
| GET | `/v1/reports/{reportId}` | Chi tiết report (auth only, không check assignment) |
| GET | `/v1/notifications` | Thông báo |
| GET | `/v1/notifications/preferences` | Cài đặt thông báo |
| POST | `/v1/media/reports/images` | Upload ảnh (dùng URL cho resolve) |

### 5.3 Auth chung

| Method | Path |
|--------|------|
| POST | `/v1/auth/refresh-token` |
| POST | `/v1/auth/change-password` |
| POST | `/v1/auth/logout` |

---

## 6. Endpoint KHÔNG dùng (CompanyManager / LEO only)

| Path | Lý do |
|------|--------|
| `GET /v1/reports/company-queue` | CM — queue chờ giao team |
| `GET /v1/reports/company-assignments` | CM — theo dõi assignment công ty |
| `GET /v1/reports/company-assignments/{reportId}` | CM — chi tiết dispatch |
| `POST /v1/reports/{id}/assign-company-team` | CM |
| `GET /v1/teams/company-teams/*` | CM quản lý team |
| `GET /v1/companies/my` | CM |

Staff gọi các endpoint trên → **403** `code: "FORBIDDEN"` (generic JWT).

**Detail task đúng cho Staff:** `GET /v1/teams/my-tasks/{reportId}` — **không** dùng `company-assignments`.

---

## 7. Chi tiết từng API

### 7.1 `GET /v1/teams/my-profile`

**Auth:** `CompanyStaff` (hoặc `Cleaner`, `Inspector`)

**Response `data`:**

```json
{
  "id": "uuid-team",
  "name": "Đội công ty Mobile Demo",
  "teamType": "Cleanup",
  "localOfficeId": null,
  "officeName": null,
  "isActive": true,
  "members": [
    {
      "userId": "uuid",
      "fullName": "Demo Staff Leader",
      "email": "staff@greenlens.dev",
      "phoneNumber": null,
      "avatarUrl": null,
      "isLeader": true,
      "joinedAt": "2026-06-01T00:00:00Z"
    }
  ],
  "createdAt": "...",
  "updatedAt": null
}
```

**Lỗi:** `404` nếu user chưa thuộc team nào.

---

### 7.2 `GET /v1/teams/my-tasks`

**Query:**

| Param | Mặc định | Mô tả |
|-------|----------|--------|
| `page` | 1 | |
| `pageSize` | 20 | max 100 |
| `assignmentStatus` | (all) | `Assigned` \| `InProgress` \| `Completed` \| `Declined` |

**Response `data`:**

```json
{
  "items": [
    {
      "reportId": "uuid-report",
      "reportCode": "REP-MOB-TSK001",
      "assignmentId": "uuid-assignment",
      "assignmentStatus": "InProgress",
      "categoryCode": "TRASH",
      "categoryName": "Ô nhiễm rác thải",
      "severity": "Medium",
      "reportStatus": "InProgress",
      "latitude": 10.7769,
      "longitude": 106.7009,
      "address": "123 Nguyễn Huệ, Phường 1, TP.HCM",
      "wardCode": "27145",
      "note": "Mobile demo assignment",
      "assignedAt": "2026-06-01T10:00:00Z",
      "startedAt": "2026-06-01T11:00:00Z",
      "completedAt": null,
      "slaResolveDueAt": "2026-06-08T10:00:00Z",
      "firstImageUrl": "https://...",
      "wasteTagCodes": ["PLASTIC"]
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

**FE routing:** mở detail bằng **`item.reportId`** — không dùng `assignmentId` trong path.

---

### 7.3 `GET /v1/teams/my-tasks/{reportId}`

> ⚠️ **Path param là `reportId` (UUID báo cáo), không phải `assignmentId`.**

**Response `data` (rút gọn):**

```json
{
  "assignmentId": "uuid",
  "assignmentStatus": "Assigned",
  "assignedAt": "...",
  "startedAt": null,
  "completedAt": null,
  "canDecline": true,
  "canUpdateProgress": false,
  "canResolve": false,

  "reportId": "uuid",
  "reportCode": "RPT-260628-09F669",
  "reportStatus": "InProgress",
  "categoryCode": "TRASH",
  "categoryName": "Ô nhiễm rác thải",
  "severity": "Medium",
  "description": "...",
  "latitude": 10.77,
  "longitude": 106.70,
  "address": "...",
  "wardCode": "26743",
  "slaResolveDueAt": "...",

  "reportImages": [{ "url": "https://...", "mimeType": "image/jpeg" }],
  "progressPercent": 0,
  "progressNote": null,
  "progressUpdatedAt": null,
  "progressUpdatedByUserId": null,
  "assignmentNote": "Ghi chú CM khi giao việc",
  "wasteTags": [{ "code": "PLASTIC", "nameVi": "...", "nameEn": "...", "iconUrl": null }]
}
```

**Flags UI (derive từ BE):**

| `assignmentStatus` | `canDecline` | `canUpdateProgress` | `canResolve` |
|--------------------|--------------|---------------------|--------------|
| `Assigned` (≤ 2h) | true | false | false |
| `InProgress` | false | true | true |
| `Completed` | false | false | false |

**Lỗi:**

| HTTP | code | Ý nghĩa |
|------|------|---------|
| 404 | `ASSIGNMENT_NOT_FOUND` | Sai `reportId` hoặc team user không được giao |
| 422 | `NOT_TEAM_MEMBER` | User chưa trong `team_members` |

---

### 7.4 `PUT /v1/teams/my-tasks/{reportId}/accept`

**Auth:** Team leader  
**Body:** không cần

**Response 200:**

```json
{
  "code": "SUCCESS",
  "message": "Đã chấp nhận task.",
  "status": 200,
  "data": null
}
```

**Transition:** `Assignment: Assigned → InProgress`

**Lỗi:** `NOT_TEAM_LEADER`, `INVALID_STATUS_TRANSITION`, `ASSIGNMENT_NOT_FOUND`, `REPORT_NOT_FOUND`

---

### 7.5 `PUT /v1/teams/my-tasks/{reportId}/decline`

**Body:**

```json
{
  "teamId": "uuid-team",
  "reason": "Không đủ nhân lực trong ca này, cần giao đội khác."
}
```

| Field | Bắt buộc | Rule |
|-------|----------|------|
| `teamId` | ✅ | UUID team của user |
| `reason` | ✅ | ≥ 20 ký tự, trong 2h kể từ `assignedAt` |

**Transition:** `Assignment: Assigned → Declined`  
Nếu mọi team decline → Report revert `Verified` (CM/LEO giao lại).

---

### 7.6 `GET /v1/teams/my-progress`

**Auth:** Team leader only  
**Query:** `page`, `pageSize`, `assignmentStatus?`

Trả lịch sử các assignment của team (tiến độ đã cập nhật).

---

### 7.7 `PUT /v1/reports/{reportId}/progress`

**Content-Type:** `multipart/form-data`

| Field | Kiểu | Bắt buộc |
|-------|------|----------|
| `progressPercent` | int 0–100 | ✅ |
| `progressNote` | string | ❌ |
| `images` | file[] | ❌ (max 5, ≤ 20MB/file) |

**Response `data`:**

```json
{
  "uploadedImageUrls": ["https://..."]
}
```

Chi tiết + flow UI: [`cleaner-progress-resolve-fe-guide.md`](./cleaner-progress-resolve-fe-guide.md).

---

### 7.8 `PUT /v1/reports/{reportId}/resolve`

**Body:**

```json
{
  "afterImageUrls": [
    "https://cdn.../after1.jpg",
    "https://cdn.../after2.jpg"
  ]
}
```

| Field | Rule |
|-------|------|
| `afterImageUrls` | ≥ 2 URL (upload trước qua `POST /v1/media/reports/images`) |

**Response 200** — `data: null`, message thành công.

**Transition:** Assignment → `Completed`; khi tất cả team completed → Report → `Resolved`.

---

## 8. Upload ảnh before resolve

```
POST /v1/media/reports/images
Content-Type: multipart/form-data
file = (image)
```

**Response `data`:** `{ "url": "https://...", ... }` — dùng URL này trong `afterImageUrls`.

(jpg/png/webp/heic, max 10MB)

---

## 9. Flow UI đề xuất (CompanyStaff shell)

```
Login (CompanyStaff)
    → GET /teams/my-profile
    → GET /teams/my-tasks?assignmentStatus=Assigned   // tab "Chờ xác nhận"
    → GET /teams/my-tasks?assignmentStatus=InProgress // tab "Đang làm"

Tap task → GET /teams/my-tasks/{reportId}   // reportId từ list

[Assigned + isLeader]
    → PUT .../accept  hoặc  PUT .../decline

[InProgress + isLeader]
    → PUT /reports/{reportId}/progress
    → upload ảnh → PUT /reports/{reportId}/resolve
```

---

## 10. Known gap BE (quan trọng cho FE)

Hiện tại `[Authorize]` trên 2 endpoint sau **chưa liệt kê `CompanyStaff`** (chỉ có `Cleaner`):

| Endpoint | Roles trên controller hiện tại |
|----------|--------------------------------|
| `PUT /v1/reports/{id}/progress` | `Cleaner, Inspector, Admin` |
| `PUT /v1/reports/{id}/resolve` | `Cleaner, Admin` |

→ CompanyStaff gọi 2 API này có thể nhận **403 FORBIDDEN** (generic) dù handler đã hỗ trợ team leader.

**Workaround tạm:** BE cần thêm `CompanyStaff` vào `[Authorize(Roles = ...)]` — 1 dòng/endpoint.  
**TeamsController** (`my-tasks`, accept, decline) đã có `CompanyStaff` ✅

---

## 11. Phân biệt status (tránh nhầm trên UI)

| Lớp | Enum | Badge trên màn Staff |
|-----|------|----------------------|
| Assignment | `Assigned`, `InProgress`, `Completed`, `Declined` | Tab/filter task |
| Report | `InProgress`, `Resolved`, … | Thông tin nền (citizen/LEO view) |

Staff chủ yếu làm việc với **AssignmentStatus**; Report chuyển `Resolved` sau khi leader resolve và mọi team hoàn thành.

---

## 12. Trace report mẫu

Report code `RPT-260628-09F669`:

1. `GET /teams/my-tasks` → tìm item có `reportCode` khớp → lấy `reportId`
2. `GET /teams/my-tasks/{reportId}` → xem flags + assignment
3. Không gọi `GET /reports/company-assignments/{id}` với role Staff

---

## 13. Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [`fe-company-manager-api-guide.md`](./fe-company-manager-api-guide.md) | API phía CM (giao việc) |
| [`cleaner-progress-resolve-fe-guide.md`](./cleaner-progress-resolve-fe-guide.md) | Progress + resolve chi tiết |
| [`MOBILE_APP_HANDOFF.md`](./MOBILE_APP_HANDOFF.md) | Tổng quan mobile shells |
| [`REPORT_LIFECYCLE.md`](./REPORT_LIFECYCLE.md) | State machine đầy đủ |

---

**Phiên bản:** 2026-07-03 · **Project:** SU26SE049 GreenLens
