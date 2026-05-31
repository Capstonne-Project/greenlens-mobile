# Cleaner — Cập nhật tiến độ & Hoàn thành báo cáo

Hướng dẫn cho FE implement màn hình **cập nhật tiến độ** và **hoàn thành phần việc** của Cleanup Team.

> Chỉ **Team Leader** mới được gọi 2 endpoint này. TeamId tự động lấy từ JWT token — không cần truyền trong body.

---

## 1. Cập nhật tiến độ

```
PUT /v1/reports/{reportId}/progress
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Form fields:**

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `progressPercent` | integer | ✅ | 0–100 |
| `progressNote` | string | ❌ | Ghi chú tiến độ |
| `images` | file[] | ❌ | Tối đa 5 ảnh, mỗi ảnh ≤ 20MB |

**Ví dụ (multipart/form-data):**
```
progressPercent = 60
progressNote    = "Đã dọn xong khu vực A, đang tiếp tục khu B"
images          = [file1.jpg, file2.jpg]
```

**Response 200:**
```json
{
  "code": "SUCCESS",
  "data": {
    "uploadedImageUrls": [
      "https://cdn.../reports/images/progress1.jpg",
      "https://cdn.../reports/images/progress2.jpg"
    ]
  }
}
```

**Lưu ý:**
- Endpoint này **không thay đổi status** của report hay assignment — chỉ lưu % tiến độ và ảnh
- Gọi được nhiều lần, mỗi lần ghi đè `progressPercent` mới nhất
- `progressPercent = 100` không tự hoàn thành — phải gọi endpoint resolve riêng

---

## 2. Hoàn thành phần việc (Resolve)

```
PUT /v1/reports/{reportId}/resolve
Authorization: Bearer {token}
Content-Type: application/json
```

**Request body:**
```json
{
  "afterImageUrls": [
    "https://cdn.../after1.jpg",
    "https://cdn.../after2.jpg"
  ]
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `afterImageUrls` | string[] | ✅ | Tối thiểu **2 ảnh** after |

**Response 204** — không có body.

**Lỗi có thể gặp:**

| HTTP | Code | Nguyên nhân |
|---|---|---|
| 422 | `INSUFFICIENT_AFTER_IMAGES` | Gửi ít hơn 2 ảnh |
| 422 | `NOT_TEAM_LEADER` | User không phải leader của team |
| 422 | `INVALID_STATUS_TRANSITION` | Report không đang ở trạng thái `InProgress` |
| 404 | `REPORT_NOT_FOUND` | Report không tồn tại |

---

## 3. Flow ảnh "after" — FE cần upload trước

`afterImageUrls` là **URL đã upload lên CDN**, không phải file gốc. FE cần:

**Bước 1** — Upload ảnh lên S3 qua presigned URL:
```
POST /v1/media/presign
```
```json
{ "fileName": "after_cleanup.jpg", "contentType": "image/jpeg" }
```
Response trả về `uploadUrl` (PUT lên S3) và `fileUrl` (URL công khai).

**Bước 2** — PUT file trực tiếp lên S3:
```js
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': 'image/jpeg' }
})
```

**Bước 3** — Gọi resolve với `fileUrl`:
```json
{
  "afterImageUrls": ["https://cdn.../after1.jpg", "https://cdn.../after2.jpg"]
}
```

---

## 4. Logic chuyển trạng thái report

```
Team A hoàn thành → assignment A = Completed
Team B chưa xong → report vẫn InProgress

Team B hoàn thành → assignment B = Completed
Tất cả team xong → report tự động chuyển InProgress → Resolved
```

> FE không cần gọi thêm API nào sau khi resolve — BE tự kiểm tra và chuyển trạng thái.

---

## 5. Flow đầy đủ trên UI

```
Màn hình chi tiết task
        │
        ▼
[Cập nhật tiến độ]              [Hoàn thành]
        │                            │
PUT /progress                        │
  form: percent, note, images        │
        │                      Upload ≥ 2 ảnh after
        ▼                      POST /media/presign × 2
  Hiển thị % mới                     │
  + preview ảnh vừa upload      PUT lên S3 × 2
                                      │
                               PUT /resolve
                               body: { afterImageUrls: [...] }
                                      │
                               204 → Chuyển sang màn hình
                                      "Phần việc đã hoàn thành"
```

---

## 6. Điều kiện hiển thị nút

| Điều kiện | Hiển thị nút |
|---|---|
| User là team leader | ✅ |
| Assignment status = `InProgress` | Cả 2 nút |
| Assignment status = `Completed` | Ẩn cả 2, hiện "Đã hoàn thành" |
| Assignment status = `Assigned` | Ẩn — chưa accept, chưa được update |
