# Cleanup Team — API Flow

> Base URL: `http://<host>/v1`  
> Auth: tất cả API đều cần header `Authorization: Bearer <access_token>`  
> Role: `Cleanup`

---

## Tổng quan flow

```
Officer assign report
        ↓
Cleanup nhận task (status: InProgress ngay lập tức)
        ↓
        ├── [Trong 2h] Từ chối → PUT /reports/{id}/decline
        │
        ├── [Tuỳ chọn, nhiều lần] Cập nhật tiến độ → PUT /reports/{id}/progress
        │                          Upload ảnh tiến độ → POST /reports/{id}/progress/images
        │
        └── Hoàn thành → PUT /reports/{id}/resolve (bắt buộc ≥ 2 ảnh after)
```

---

## 1. Xem danh sách task được giao

```
GET /v1/reports/my-assignments
```

**Query params:**

| Param | Type | Mô tả |
|---|---|---|
| `page` | int | Trang hiện tại (default: 1) |
| `pageSize` | int | Số item mỗi trang (default: 20) |
| `assignmentStatus` | string | Lọc theo status: `InProgress`, `Completed`, `Declined` |

**Response 200:**

```json
{
  "code": "SUCCESS",
  "status": 200,
  "data": {
    "items": [
      {
        "reportId": "aff788d8-5b32-4aef-92e3-7c20a1600c5f",
        "reportCode": "RPT-260518-1BD012",
        "assignmentId": "ad68cf46-32a6-44d7-ac9b-690858df1df6",
        "assignmentStatus": "InProgress",
        "categoryCode": "TRASH",
        "categoryName": "Rác thải",
        "severity": "High",
        "reportStatus": "InProgress",
        "latitude": 10.7769,
        "longitude": 106.7009,
        "address": "123 Nguyễn Huệ, Phường Bến Nghé",
        "wardCode": "26743",
        "note": "Khu vực tập kết rác lớn",
        "assignedAt": "2026-05-19T08:00:00Z",
        "startedAt": "2026-05-19T08:00:00Z",
        "completedAt": null,
        "slaResolveDueAt": "2026-05-24T08:00:00Z",
        "firstImageUrl": "https://cdn.example.com/reports/abc.jpg",
        "progressPercent": 0,
        "progressNote": null,
        "progressUpdatedAt": null,
        "canDecline": true
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

**Lưu ý field quan trọng:**

| Field | Ý nghĩa |
|---|---|
| `canDecline` | `true` nếu còn trong 2h kể từ `assignedAt` — dùng để hiện/ẩn nút Từ chối |
| `progressPercent` | % tiến độ lần cập nhật gần nhất (0 nếu chưa cập nhật) |
| `progressNote` | Ghi chú tiến độ lần gần nhất |
| `slaResolveDueAt` | Deadline hoàn thành — dùng để hiển thị countdown |

---

## 2. Xem chi tiết report

```
GET /v1/reports/{id}
```

**Path param:** `id` — reportId (uuid)

**Response 200:** trả về full thông tin report kèm media, assignments, lịch sử status.

---

## 3. Từ chối task *(chỉ trong 2h đầu)*

```
PUT /v1/reports/{id}/decline
```

**Path param:** `id` — reportId

**Request body:**

```json
{
  "teamId": "4c951a07-8d5f-4036-8bee-89a65c1c21f5",
  "reason": "Đội không đủ nhân lực xử lý khu vực này trong tuần này"
}
```

| Field | Bắt buộc | Validation |
|---|---|---|
| `teamId` | ✓ | uuid — teamId của team đang login |
| `reason` | ✓ | Tối thiểu 20 ký tự |

**Responses:**

| Code | Mô tả |
|---|---|
| 204 | Từ chối thành công |
| 422 `INVALID_STATUS_TRANSITION` | Assignment không ở trạng thái InProgress |
| 422 `DECLINE_WINDOW_EXPIRED` | Đã quá 2h kể từ khi được giao |
| 422 `REASON_TOO_SHORT` | Lý do ít hơn 20 ký tự |
| 404 `ASSIGNMENT_NOT_FOUND` | Không tìm thấy assignment của team này |

**Sau khi decline:**
- Nếu **tất cả** team đều decline → report quay về `Verified`, officer sẽ assign lại.
- Nếu còn team khác đang làm → chỉ assignment của team này bị `Declined`, report vẫn `InProgress`.

---

## 4. Cập nhật tiến độ *(tuỳ chọn, nhiều lần)*

```
PUT /v1/reports/{id}/progress
```

**Path param:** `id` — reportId

**Request body:**

```json
{
  "teamId": "4c951a07-8d5f-4036-8bee-89a65c1c21f5",
  "progressPercent": 60,
  "progressNote": "Đã dọn xong khu A, đang xử lý khu B"
}
```

| Field | Bắt buộc | Validation |
|---|---|---|
| `teamId` | ✓ | uuid |
| `progressPercent` | ✓ | 0 – 100 |
| `progressNote` | Không | Ghi chú tự do |

**Responses:**

| Code | Mô tả |
|---|---|
| 204 | Cập nhật thành công |
| 422 `INVALID_STATUS_TRANSITION` | Assignment không ở trạng thái InProgress |
| 422 `INVALID_PROGRESS_PERCENT` | Percent ngoài khoảng 0–100 |

**Lưu ý:** Chỉ update `progress_percent`, `progress_note` trong bảng `report_assignments`. Status không đổi.

---

## 5. Upload ảnh tiến độ *(tuỳ chọn)*

```
POST /v1/reports/{id}/progress/images
Content-Type: multipart/form-data
```

**Path param:** `id` — reportId

**Form fields:**

| Field | Type | Bắt buộc |
|---|---|---|
| `teamId` | uuid | ✓ |
| `image` | file | ✓ |

**Giới hạn file:** tối đa 20MB, định dạng ảnh (jpg, png, webp).

**Response 200:**

```json
{
  "code": "SUCCESS",
  "status": 200,
  "data": {
    "url": "https://cdn.example.com/progress/xyz.jpg"
  }
}
```

**Lưu ý:** API này chỉ upload và trả về URL. URL này dùng để điền vào `progressNote` hoặc hiển thị trong app. Không tự động gắn vào report — dùng kèm với API cập nhật tiến độ nếu cần.

**Responses:**

| Code | Mô tả |
|---|---|
| 200 | Upload thành công, trả về URL |
| 413 `FILE_TOO_LARGE` | File > 20MB |
| 422 `INVALID_STATUS_TRANSITION` | Assignment không InProgress |

---

## 6. Hoàn thành — submit kết quả

```
PUT /v1/reports/{id}/resolve
```

**Path param:** `id` — reportId

**Request body:**

```json
{
  "teamId": "4c951a07-8d5f-4036-8bee-89a65c1c21f5",
  "afterImageUrls": [
    "https://cdn.example.com/after/img1.jpg",
    "https://cdn.example.com/after/img2.jpg"
  ]
}
```

| Field | Bắt buộc | Validation |
|---|---|---|
| `teamId` | ✓ | uuid |
| `afterImageUrls` | ✓ | Tối thiểu **2 URL** ảnh after |

**Responses:**

| Code | Mô tả |
|---|---|
| 204 | Hoàn thành thành công |
| 422 `INSUFFICIENT_AFTER_IMAGES` | Thiếu ảnh after (cần ≥ 2) |
| 422 `INVALID_STATUS_TRANSITION` | Assignment không ở trạng thái InProgress |
| 404 `ASSIGNMENT_NOT_FOUND` | Không tìm thấy assignment của team này |

**Sau khi resolve:**
- Assignment của team này → `Completed`
- Nếu **tất cả** team đều `Completed` → report chuyển `InProgress → Resolved`
- Nếu còn team khác chưa xong → report vẫn `InProgress`

---

## 7. Flow upload ảnh after (trước khi gọi resolve)

Ảnh after cần được upload lên storage trước, lấy URL rồi mới gọi `/resolve`. Dùng API upload ảnh tiến độ:

```
POST /v1/reports/{id}/progress/images   ← upload ảnh after 1, lấy url1
POST /v1/reports/{id}/progress/images   ← upload ảnh after 2, lấy url2

PUT /v1/reports/{id}/resolve
{
  "teamId": "...",
  "afterImageUrls": ["url1", "url2"]
}
```

---

## Tóm tắt trạng thái

### Report status
| Status | Ý nghĩa với Cleanup |
|---|---|
| `InProgress` | Đang được giao cho team xử lý |
| `Resolved` | Tất cả team đã hoàn thành |
| `Verified` | Tất cả team đã decline, chờ officer assign lại |

### Assignment status
| Status | Ý nghĩa |
|---|---|
| `InProgress` | Đang xử lý (trạng thái ngay khi được giao) |
| `Completed` | Team đã hoàn thành phần việc |
| `Declined` | Team từ chối trong 2h đầu |

---

## Error codes tổng hợp

| Code | HTTP | Mô tả |
|---|---|---|
| `REPORT_NOT_FOUND` | 404 | Không tìm thấy report |
| `ASSIGNMENT_NOT_FOUND` | 404 | Không tìm thấy assignment của team |
| `INVALID_STATUS_TRANSITION` | 422 | Sai trạng thái để thực hiện hành động |
| `DECLINE_WINDOW_EXPIRED` | 422 | Quá 2h kể từ khi được giao |
| `REASON_TOO_SHORT` | 422 | Lý do từ chối < 20 ký tự |
| `INSUFFICIENT_AFTER_IMAGES` | 422 | Ảnh after < 2 tấm |
| `INVALID_PROGRESS_PERCENT` | 422 | Percent không nằm trong 0–100 |
| `FILE_TOO_LARGE` | 413 | File upload > 20MB |
