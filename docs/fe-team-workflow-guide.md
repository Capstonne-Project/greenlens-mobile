# FE Guide — Team Cleanup / Inspector Workflow

> **Dành cho:** Frontend developer tích hợp luồng Cleanup / Inspector team.  
> **Base URL:** `https://<host>/v1`  
> **Auth:** tất cả endpoint dưới đây đều yêu cầu `Authorization: Bearer <token>` (role `Cleanup` hoặc `Inspector`).

---

## Tổng quan luồng

```
Officer assign report
        │
        ▼
Assignment tạo ra  ─────────────────────────────────────────────────────────────────────────┐
   status = Assigned                                                                         │
        │                                                                                    │
        ├─ GET /v1/teams/my-tasks         ← FE load danh sách task (list view)              │
        │                                                                                    │
        ├─ GET /v1/teams/my-tasks/{id}    ← FE xem chi tiết task (detail view)              │
        │                                                                                    │
        ├── [Có nút "Từ chối" nếu CanDecline = true]                                        │
        │      PUT /v1/teams/my-tasks/{id}/decline ──► Assignment = Declined                 │
        │      (nếu TẤT CẢ team decline → Report quay về Verified, officer tái phân công)   │
        │                                                                                    │
        └── [Có nút "Chấp nhận"]                                                             │
               PUT /v1/teams/my-tasks/{id}/accept                                            │
                       │                                                                     │
                       ▼                                                                     │
               Assignment = InProgress                                                       │
               Report.StartedAt được ghi (lần đầu accept)                                   │
                       │                                                                     │
                       ├─ PUT /v1/reports/{id}/progress  ← cập nhật % + ghi chú + ảnh      │
                       │                                                                     │
                       └─ PUT /v1/reports/{id}/resolve   ← hoàn thành (≥ 2 ảnh after)      │
                                  │                                                          │
                                  ▼                                                          │
                          Assignment = Completed                                             │
                 (tất cả team Completed → Report = Resolved / PenaltyIssued)                │
                                                                                            │
GET /v1/teams/my-progress  ← xem lịch sử tiến độ bất cứ lúc nào ──────────────────────────┘
```

---

## Enum reference

### AssignmentStatus (trạng thái của một assignment)

| Giá trị | Số | Ý nghĩa |
|---|---|---|
| `Assigned` | 0 | Vừa được phân công, chờ team chấp nhận hoặc từ chối |
| `InProgress` | 1 | Team đã chấp nhận, đang thực hiện |
| `Completed` | 2 | Team đã hoàn thành phần việc |
| `Declined` | 3 | Team đã từ chối trong vòng 2h |

> **Dùng làm filter trên header list:**  
> Không truyền → lấy tất cả | `Assigned` → chờ xác nhận | `InProgress` → đang làm | `Completed` → đã xong | `Declined` → đã từ chối

### ReportStatus (trạng thái của report, xuất hiện trong response)

| Giá trị | Ý nghĩa |
|---|---|
| `Submitted` | Mới tạo, chờ officer xác minh |
| `Verified` | Officer đã xác minh, chờ phân công |
| `InProgress` | Đang được team xử lý |
| `Resolved` | Tất cả Cleanup team đã hoàn thành |
| `PenaltyIssued` | Inspector đã xử phạt |
| `Closed` | Đã đóng hoàn toàn |
| `Rejected` | Officer từ chối (không hợp lệ) |
| `Duplicate` | Trùng với báo cáo khác |

### Severity (mức độ nghiêm trọng)

| Giá trị | Màu gợi ý |
|---|---|
| `Low` | xanh lá |
| `Medium` | vàng |
| `High` | cam |
| `Critical` | đỏ |

---

## API Chi tiết

---

### 1. Danh sách task của team

```
GET /v1/teams/my-tasks
```

**Mô tả:** Lấy danh sách tất cả task (report assignment) được giao cho team của user đang đăng nhập. TeamId tự lấy từ token.

**Query params:**

| Param | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `page` | int | không | 1 | Số trang |
| `pageSize` | int | không | 20 | Số item / trang |
| `assignmentStatus` | string | không | (tất cả) | Filter theo `Assigned` / `InProgress` / `Completed` / `Declined` |

**Response 200:**

```json
{
  "status": 200,
  "data": {
    "items": [
      {
        "reportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "reportCode": "RPT-2026-00042",
        "assignmentId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "assignmentStatus": "Assigned",
        "categoryCode": "WASTE",
        "categoryName": "Rác thải",
        "severity": "High",
        "reportStatus": "InProgress",
        "latitude": 10.7769,
        "longitude": 106.7009,
        "address": "123 Nguyễn Huệ, Q.1, TP.HCM",
        "wardCode": "26734",
        "note": "Ghi chú từ officer",
        "assignedAt": "2026-05-19T08:00:00Z",
        "startedAt": null,
        "completedAt": null,
        "slaResolveDueAt": "2026-05-24T08:00:00Z",
        "firstImageUrl": "https://cdn.example.com/reports/xxx/img1.jpg"
      }
    ],
    "totalCount": 15,
    "page": 1,
    "pageSize": 20
  }
}
```

**Gợi ý UI:**
- Dùng `assignmentStatus` làm tab/chip filter trên header: **Tất cả | Chờ xác nhận | Đang làm | Hoàn thành | Từ chối**
- Hiển thị badge màu theo `severity`
- Hiển thị countdown SLA nếu `slaResolveDueAt` còn trong 24h
- Tap vào item → navigate sang Detail

---

### 2. Chi tiết task

```
GET /v1/teams/my-tasks/{reportId}
```

**Path param:** `reportId` — UUID của report

**Response 200:**

```json
{
  "status": 200,
  "data": {
    "assignmentId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "assignmentStatus": "Assigned",
    "assignedAt": "2026-05-19T08:00:00Z",
    "startedAt": null,
    "completedAt": null,
    "canDecline": true,
    "canUpdateProgress": false,
    "canResolve": false,

    "reportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "reportCode": "RPT-2026-00042",
    "reportStatus": "InProgress",
    "categoryCode": "WASTE",
    "categoryName": "Rác thải",
    "severity": "High",
    "description": "Bãi rác tự phát cạnh kênh Tẻ",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "address": "123 Nguyễn Huệ, Q.1",
    "wardCode": "26734",

    "slaResolveDueAt": "2026-05-24T08:00:00Z",

    "reportImages": [
      { "url": "https://cdn.example.com/reports/xxx/before1.jpg", "mimeType": "image/jpeg" },
      { "url": "https://cdn.example.com/reports/xxx/before2.jpg", "mimeType": "image/jpeg" }
    ],

    "progressPercent": 0,
    "progressNote": null,
    "progressUpdatedAt": null,
    "progressUpdatedByUserId": null,

    "assignmentNote": "Ưu tiên xử lý trước 17h hôm nay"
  }
}
```

**Các cờ điều khiển UI — quan trọng:**

| Cờ | Giá trị | Hiển thị gì |
|---|---|---|
| `canDecline` | `true` | Hiện nút **Từ chối** (chỉ khi status = `Assigned` và chưa quá 2h) |
| `canDecline` | `false` | Ẩn / disabled nút Từ chối |
| `canUpdateProgress` | `true` | Hiện form **Cập nhật tiến độ** |
| `canResolve` | `true` | Hiện nút **Hoàn thành** |

> Cả `canUpdateProgress` và `canResolve` đều `true` khi `assignmentStatus = InProgress`.  
> Sau khi Accept → gọi lại API này để refresh cờ.

**Error codes:**

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 404 | `ASSIGNMENT_NOT_FOUND` | Team không có assignment cho report này |
| 422 | `NOT_TEAM_MEMBER` | User không thuộc team nào |

---

### 3. Chấp nhận task

```
PUT /v1/teams/my-tasks/{reportId}/accept
```

**Mô tả:** Chỉ **Team Leader** mới gọi được. Chuyển assignment `Assigned → InProgress`.

**Body:** không cần (empty / `{}`)

**Response:** `204 No Content`

**Error codes:**

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 422 | `NOT_TEAM_LEADER` | User không phải leader |
| 422 | `INVALID_STATUS_TRANSITION` | Assignment không ở trạng thái `Assigned` |
| 404 | `REPORT_NOT_FOUND` | Report không tồn tại |
| 404 | `ASSIGNMENT_NOT_FOUND` | Team không có assignment cho report này |

**Sau khi thành công:** Gọi lại `GET /v1/teams/my-tasks/{reportId}` để refresh — `canDecline` sẽ thành `false`, `canUpdateProgress` và `canResolve` thành `true`.

---

### 4. Từ chối task

```
PUT /v1/teams/my-tasks/{reportId}/decline
```

**Mô tả:** Team từ chối trong vòng 2h sau khi được phân công. Lý do tối thiểu 20 ký tự.

**Body:**

```json
{
  "teamId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "reason": "Team đang thực hiện khẩn cấp tại khu vực khác, không đủ nhân lực"
}
```

> **Lưu ý:** `teamId` là ID của team đang đăng nhập. FE lấy từ thông tin profile team (`GET /v1/teams/my-profile`).

**Response:** `204 No Content`

**Error codes:**

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 422 | `REASON_TOO_SHORT` | Lý do < 20 ký tự |
| 422 | `DECLINE_WINDOW_EXPIRED` | Đã quá 2h kể từ lúc assign |
| 422 | `INVALID_STATUS_TRANSITION` | Assignment không ở trạng thái `Assigned` |
| 404 | `ASSIGNMENT_NOT_FOUND` | Không tìm thấy assignment |

**Side effect quan trọng:** Nếu tất cả team được phân công cho report này đều decline → Report tự động quay về `Verified`, officer sẽ phân công lại.

---

### 5. Cập nhật tiến độ + ảnh

```
PUT /v1/reports/{reportId}/progress
Content-Type: multipart/form-data
```

> **Lưu ý URL:** Endpoint này nằm ở `/v1/reports/`, không phải `/v1/teams/`.

**Mô tả:** Team Leader cập nhật phần trăm tiến độ, ghi chú, và tùy chọn upload ảnh minh chứng. TeamId tự lấy từ token.

**Form fields:**

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `progressPercent` | int | có | 0–100 |
| `progressNote` | string | không | Ghi chú tiến độ |
| `images` | file[] | không | Tối đa 5 ảnh, mỗi ảnh ≤ 20MB, định dạng jpg/png/webp |

**Ví dụ gọi (multipart):**
```
progressPercent: 60
progressNote: Đã dọn xong khu vực A, đang xử lý khu vực B
images: [file1.jpg, file2.jpg]
```

**Response 200:**

```json
{
  "status": 200,
  "data": {
    "uploadedImageUrls": [
      "https://cdn.example.com/reports/xxx/progress/img1.jpg",
      "https://cdn.example.com/reports/xxx/progress/img2.jpg"
    ]
  }
}
```

**Error codes:**

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 413 | `FILE_TOO_LARGE` | File > 20MB |
| 422 | `NOT_TEAM_LEADER` | Chỉ leader mới được cập nhật |
| 422 | `INVALID_STATUS_TRANSITION` | Assignment không ở trạng thái `InProgress` |

---

### 6. Hoàn thành task (Cleanup Team)

```
PUT /v1/reports/{reportId}/resolve
```

> **Lưu ý URL:** Endpoint này nằm ở `/v1/reports/`.

**Mô tả:** Cleanup Team Leader đánh dấu phần việc đã hoàn thành. **Bắt buộc ≥ 2 ảnh "after"** (đã upload trước đó qua progress API, truyền lại URL).

**Body:**

```json
{
  "teamId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "afterImageUrls": [
    "https://cdn.example.com/reports/xxx/progress/after1.jpg",
    "https://cdn.example.com/reports/xxx/progress/after2.jpg"
  ]
}
```

**Response:** `204 No Content`

**Error codes:**

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 422 | `INSUFFICIENT_AFTER_IMAGES` | Ít hơn 2 ảnh after |
| 422 | `INVALID_STATUS_TRANSITION` | Assignment không ở trạng thái `InProgress` |

**Side effect:** Khi TẤT CẢ team của report đều `Completed` → Report chuyển `InProgress → Resolved`.

---

### 7. Lịch sử tiến độ của team

```
GET /v1/teams/my-progress
```

**Mô tả:** Xem lịch sử các task đã xử lý. **Chỉ Team Leader** mới gọi được. TeamId tự lấy từ token.

**Query params:**

| Param | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|---|
| `page` | int | không | 1 | Số trang |
| `pageSize` | int | không | 20 | Số item / trang |
| `assignmentStatus` | string | không | (tất cả) | Filter theo trạng thái |

**Response 200:**

```json
{
  "status": 200,
  "data": {
    "items": [
      {
        "reportId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "reportCode": "RPT-2026-00042",
        "assignmentId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "assignmentStatus": "Completed",
        "reportStatus": "Resolved",
        "progressPercent": 100,
        "progressNote": "Hoàn thành toàn bộ khu vực",
        "progressUpdatedAt": "2026-05-19T14:30:00Z",
        "progressUpdatedByUserId": "user-uuid-here",
        "assignedAt": "2026-05-19T08:00:00Z",
        "startedAt": "2026-05-19T09:00:00Z",
        "completedAt": "2026-05-19T14:35:00Z"
      }
    ],
    "totalCount": 8,
    "page": 1,
    "pageSize": 20
  }
}
```

**Error codes:**

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 422 | `NOT_TEAM_LEADER` | Chỉ leader mới xem được |

---

### 8. Profile team của tôi

```
GET /v1/teams/my-profile
```

**Mô tả:** Lấy thông tin team và danh sách thành viên. Dùng để lấy `teamId` khi cần truyền vào body (Decline, Resolve).

**Response 200:**

```json
{
  "status": 200,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Đội Cleanup Q.1",
    "teamType": "Cleanup",
    "isActive": true,
    "members": [
      {
        "userId": "user-uuid-1",
        "fullName": "Nguyễn Văn A",
        "email": "a@example.com",
        "isLeader": true
      }
    ]
  }
}
```

---

## Luồng màn hình gợi ý

### Screen 1: Danh sách task (my-tasks)

```
┌─────────────────────────────────────────┐
│  Tasks của team                   [🔔]  │
│                                         │
│  [Tất cả] [Chờ xác nhận] [Đang làm]    │
│           [Hoàn thành]   [Từ chối]      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ RPT-2026-00042         [HIGH]   │    │
│  │ Rác thải · Q.1                  │    │
│  │ SLA: còn 4 ngày 12 giờ         │    │
│  │ Status: Chờ xác nhận ●          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ RPT-2026-00038         [MEDIUM] │    │
│  │ Nước thải · Q.3                 │    │
│  │ Tiến độ: 60%                    │    │
│  │ Status: Đang làm ●              │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Screen 2: Chi tiết task

```
┌─────────────────────────────────────────┐
│  ← Chi tiết task                        │
│                                         │
│  RPT-2026-00042  [HIGH]  Rác thải       │
│  123 Nguyễn Huệ, Q.1                   │
│  SLA: 24/05/2026 08:00                  │
│                                         │
│  [Ảnh before 1]  [Ảnh before 2]        │
│                                         │
│  Mô tả: Bãi rác tự phát cạnh kênh Tẻ  │
│  Ghi chú officer: Ưu tiên xử lý trước  │
│                    17h hôm nay          │
│                                         │
│  ─── Tiến độ hiện tại: 0% ───           │
│                                         │
│  ┌──────────────┐  ┌──────────────┐    │
│  │  Từ chối     │  │  Chấp nhận   │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘

(Sau khi Accept → canDecline=false, canUpdateProgress=true, canResolve=true)

┌─────────────────────────────────────────┐
│  ← Chi tiết task                        │
│  ...                                    │
│  ─── Tiến độ hiện tại: 60% ───          │
│  [============================    ]     │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  Cập nhật tiến độ              │    │
│  │  % tiến độ: [60      ]         │    │
│  │  Ghi chú:   [________]         │    │
│  │  Ảnh:       [+ Thêm ảnh]       │    │
│  │             [Cập nhật]         │    │
│  └────────────────────────────────┘    │
│                                         │
│  [     Hoàn thành (resolve)     ]       │
└─────────────────────────────────────────┘
```

---

## Tóm tắt nhanh (Quick Reference)

| Hành động | Method | URL | Body / Params | Ai gọi được |
|---|---|---|---|---|
| Xem danh sách task | `GET` | `/v1/teams/my-tasks` | `?assignmentStatus=&page=&pageSize=` | Tất cả thành viên |
| Xem chi tiết task | `GET` | `/v1/teams/my-tasks/{reportId}` | — | Tất cả thành viên |
| Chấp nhận task | `PUT` | `/v1/teams/my-tasks/{reportId}/accept` | empty body | Chỉ Team Leader |
| Từ chối task | `PUT` | `/v1/teams/my-tasks/{reportId}/decline` | `{ teamId, reason }` | Chỉ Team Leader |
| Cập nhật tiến độ | `PUT` | `/v1/reports/{reportId}/progress` | `multipart: progressPercent, progressNote, images[]` | Chỉ Team Leader |
| Hoàn thành (Cleanup) | `PUT` | `/v1/reports/{reportId}/resolve` | `{ teamId, afterImageUrls[] }` | Chỉ Team Leader |
| Xem lịch sử tiến độ | `GET` | `/v1/teams/my-progress` | `?assignmentStatus=&page=&pageSize=` | Chỉ Team Leader |
| Xem profile team | `GET` | `/v1/teams/my-profile` | — | Tất cả thành viên |

---

## Lưu ý quan trọng cho FE

1. **teamId:** Lấy từ `GET /v1/teams/my-profile` → `data.id`. Cần truyền vào body của Decline và Resolve.

2. **Cờ `canDecline`:** Chỉ `true` khi `assignmentStatus = Assigned` VÀ chưa quá 2h kể từ `assignedAt`. FE nên tính thêm countdown phía client để ẩn nút trước khi hết hạn.

3. **Progress images → Resolve:** FE phải lưu lại các URL trả về từ API `progress` để truyền vào `afterImageUrls` khi gọi `resolve`.

4. **Refresh sau accept:** Sau khi PUT accept thành công (204), gọi lại GET detail để cập nhật `canDecline/canUpdateProgress/canResolve`.

5. **Inspector vs Cleanup:** Endpoint `resolve` dành cho **Cleanup**. Inspector dùng `PUT /v1/reports/{id}/penalty` (xử phạt) hoặc `PUT /v1/reports/{id}/close-no-violation` (không vi phạm) — xem thêm tài liệu Inspector workflow.

6. **Pagination:** Mặc định `pageSize=20`. Gợi ý dùng infinite scroll hoặc "load more" thay vì số trang cứng.

7. **SLA countdown:** `slaResolveDueAt` là UTC. FE tự convert sang giờ local và hiển thị cảnh báo đỏ khi còn < 24h.
