# Cleanup Team — API Flow

> Tài liệu này mô tả toàn bộ flow API dành cho **Cleanup Team** (role: `Cleanup`).  
> Base URL: `/v1`  
> Auth: `Authorization: Bearer <access_token>` (trừ nơi ghi rõ Anonymous)

---

## Tổng quan flow

```
[Officer assign]
      │
      ▼
 ReportStatus: Assigned
 AssignmentStatus: Assigned
      │
      ├──── Team từ chối (trong 2h) ──► ReportStatus: Verified  (officer assign lại)
      │
      ▼ Team chấp nhận
 ReportStatus: InProgress
 AssignmentStatus: InProgress
      │
      ├──── Upload ảnh tiến độ  (nhiều lần, không đổi status)
      ├──── Cập nhật % + ghi chú (nhiều lần, không đổi status)
      │
      ▼ Team bấm Hoàn thành (≥ 2 ảnh after)
 AssignmentStatus: Completed
 ReportStatus: Resolved  (khi TẤT CẢ team hoàn thành)
      │
      ▼
 Citizen xác nhận / Auto sau 7 ngày
 ReportStatus: Closed
```

---

## Bước 1 — Xem danh sách task được giao

### `GET /v1/reports/my-assignments`

> Team xem các báo cáo được phân công cho team mình.

**Query params:**

| Param | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `page` | int | Không | Trang (default: 1) |
| `pageSize` | int | Không | Số item/trang (default: 20) |
| `assignmentStatus` | string | Không | Filter: `Assigned` / `InProgress` / `Completed` / `Declined` |

**Response `200`:**
```json
{
  "status": 200,
  "data": {
    "items": [
      {
        "reportId": "3fa85f64-...",
        "reportCode": "RPT-20260518-0042",
        "assignmentId": "7cb12a...",
        "assignmentStatus": "Assigned",
        "reportStatus": "Assigned",
        "categoryCode": "TRASH",
        "categoryName": "Rác thải",
        "severity": "High",
        "latitude": 10.7769,
        "longitude": 106.7009,
        "address": "123 Lê Lợi, Q.1, TP.HCM",
        "wardCode": "26734",
        "note": "Gần cống thoát nước",
        "assignedAt": "2026-05-18T08:00:00Z",
        "startedAt": null,
        "completedAt": null,
        "slaResolveDueAt": "2026-05-23T08:00:00Z",
        "firstImageUrl": "https://cdn.../reports/abc.jpg"
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## Bước 2 — Chấp nhận task

### `PUT /v1/reports/{reportId}/accept`

> Team chấp nhận task. Chuyển `AssignmentStatus: Assigned → InProgress`, `ReportStatus: Assigned → InProgress`.

**Request body:**
```json
{
  "teamId": "team-guid-here"
}
```

**Response `204 No Content`** — thành công, không có body.

**Lỗi có thể gặp:**

| HTTP | Code | Mô tả |
|------|------|-------|
| 422 | `INVALID_STATUS_TRANSITION` | Report không ở trạng thái `Assigned` |
| 422 | `ASSIGNMENT_NOT_FOUND` | Team không được gán cho báo cáo này |

---

## Bước 3a — Từ chối task (nếu không nhận)

### `PUT /v1/reports/{reportId}/decline`

> Team từ chối task. Chỉ được thực hiện **trong vòng 2 giờ** sau khi được assign.  
> Nếu tất cả team đều từ chối → `ReportStatus` quay về `Verified`.

**Request body:**
```json
{
  "teamId": "team-guid-here",
  "reason": "Team đang xử lý sự cố khác tại khu vực lân cận, không đủ nhân lực."
}
```

> `reason` phải **≥ 20 ký tự**.

**Response `204 No Content`** — thành công.

**Lỗi có thể gặp:**

| HTTP | Code | Mô tả |
|------|------|-------|
| 422 | `DECLINE_WINDOW_EXPIRED` | Đã quá 2 giờ kể từ khi được assign |
| 422 | `REASON_TOO_SHORT` | Lý do ít hơn 20 ký tự |
| 422 | `INVALID_STATUS_TRANSITION` | Assignment không ở trạng thái `Assigned` |

---

## Bước 3b — Upload ảnh tiến độ (có thể gọi nhiều lần)

### `POST /v1/reports/{reportId}/progress/images`

> Upload ảnh chụp trong quá trình dọn dẹp. Trả về URL để dùng ở bước cập nhật tiến độ.  
> Assignment phải đang `InProgress`.

**Request:** `multipart/form-data`

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `teamId` | guid | Có | ID của team |
| `image` | file | Có | Ảnh (max 20MB, jpg/png) |

**Response `200`:**
```json
{
  "status": 200,
  "data": {
    "imageUrl": "https://cdn.../reports/3fa85f64/progress/team-id/img_001.jpg"
  }
}
```

**Lỗi có thể gặp:**

| HTTP | Code | Mô tả |
|------|------|-------|
| 413 | `FILE_TOO_LARGE` | File > 20MB |
| 422 | `ASSIGNMENT_NOT_IN_PROGRESS` | Assignment chưa InProgress |

---

## Bước 3c — Cập nhật tiến độ (có thể gọi nhiều lần)

### `PUT /v1/reports/{reportId}/progress`

> Team leader cập nhật % hoàn thành và ghi chú. **Không thay đổi status**, chỉ lưu thông tin tiến độ.  
> Có thể gọi nhiều lần trong suốt quá trình làm việc.

**Request body:**
```json
{
  "teamId": "team-guid-here",
  "progressPercent": 60,
  "progressNote": "Đã dọn xong khu vực A, đang tiến hành khu vực B. Ước tính hoàn thành lúc 15:00."
}
```

> `progressPercent`: 0–100  
> `progressNote`: tuỳ chọn, tối đa 1000 ký tự

**Response `204 No Content`** — thành công.

**Lỗi có thể gặp:**

| HTTP | Code | Mô tả |
|------|------|-------|
| 422 | `ASSIGNMENT_NOT_IN_PROGRESS` | Assignment chưa InProgress |
| 422 | `INVALID_PROGRESS_PERCENT` | Percent ngoài khoảng 0–100 |

---

## Bước 4 — Hoàn thành task

### `PUT /v1/reports/{reportId}/resolve`

> Team đánh dấu hoàn thành. Yêu cầu **ít nhất 2 ảnh after** (URL lấy từ bước upload).  
> Khi tất cả team được giao đều hoàn thành → `ReportStatus` chuyển sang `Resolved`.

**Request body:**
```json
{
  "teamId": "team-guid-here",
  "afterImageUrls": [
    "https://cdn.../reports/abc/after/img_001.jpg",
    "https://cdn.../reports/abc/after/img_002.jpg"
  ]
}
```

> `afterImageUrls` phải có **≥ 2 URL**.  
> Các URL này lấy từ kết quả của `POST /progress/images` hoặc upload riêng.

**Response `204 No Content`** — thành công.

**Lỗi có thể gặp:**

| HTTP | Code | Mô tả |
|------|------|-------|
| 422 | `INSUFFICIENT_AFTER_IMAGES` | Ít hơn 2 ảnh after |
| 422 | `INVALID_STATUS_TRANSITION` | Report không ở trạng thái InProgress |
| 422 | `ASSIGNMENT_NOT_FOUND` | Team không được gán cho báo cáo này |

---

## Tóm tắt nhanh

| Thứ tự | API | Method | Endpoint | Kết quả |
|--------|-----|--------|----------|---------|
| 1 | Xem task | `GET` | `/v1/reports/my-assignments` | Danh sách task + status |
| 2 | Chấp nhận | `PUT` | `/v1/reports/{id}/accept` | `Assigned → InProgress` |
| 3a | Từ chối | `PUT` | `/v1/reports/{id}/decline` | `Assigned → Declined` (report → Verified nếu all declined) |
| 3b | Upload ảnh tiến độ | `POST` | `/v1/reports/{id}/progress/images` | Trả về `imageUrl` |
| 3c | Cập nhật % tiến độ | `PUT` | `/v1/reports/{id}/progress` | Lưu %, note — không đổi status |
| 4 | Hoàn thành | `PUT` | `/v1/reports/{id}/resolve` | `InProgress → Completed` (report → Resolved nếu all done) |

---

## Trạng thái Assignment

| AssignmentStatus | Ý nghĩa |
|-----------------|---------|
| `Assigned` | Vừa được giao, chưa phản hồi |
| `InProgress` | Team đã chấp nhận, đang xử lý |
| `Completed` | Team đã hoàn thành |
| `Declined` | Team từ chối trong 2h |

## Trạng thái Report (liên quan Cleanup)

| ReportStatus | Ý nghĩa |
|-------------|---------|
| `Verified` | Officer đã xác minh, chờ assign |
| `Assigned` | Đã giao team, chờ team phản hồi |
| `InProgress` | Team đang xử lý |
| `Resolved` | Tất cả team hoàn thành |
| `Closed` | Citizen xác nhận / auto sau 7 ngày |

---

> **Lưu ý cho FE:**
> - Tất cả API đều yêu cầu `Authorization: Bearer <token>` với role `Cleanup`.
> - `teamId` trong request body là ID của team mà user đang thuộc về — FE nên lưu lại sau khi login.
> - Bước 3b và 3c có thể lặp lại nhiều lần tùy ý trong khi đang `InProgress`.
> - Ảnh upload ở bước 3b dùng `multipart/form-data`, các API còn lại dùng `application/json`.
