# Mobile — POST check-exif-location (EXIF GPS cảnh báo trước submit)

> **Audience:** Mobile FE (`green-lens-app`)  
> **Mục đích:** Tích hợp API kiểm tra EXIF GPS **trước khi citizen gửi báo cáo** — hiển thị dialog cảnh báo khi vị trí chọn trên bản đồ lệch so với GPS nhúng trong ảnh.  
> **Cập nhật:** 2026-09-01 — theo implementation hiện tại trong repository  
> **Business rules:** BR-REP-003 (GPS Việt Nam), BR-REP-011 (chất lượng EXIF GPS)  
> **System setting:** `exif_gps_mismatch_meters` (module **Geo**, mặc định **200** m)

---

## 0. TL;DR

| Mục | Giá trị |
|-----|---------|
| **Method / path** | `POST /v1/reports/check-exif-location` |
| **Full URL (prod ví dụ)** | `https://api.greenlens.com.vn/v1/reports/check-exif-location` |
| **Auth** | Bắt buộc — role **Citizen** (`Authorization: Bearer {accessToken}`) |
| **Mục đích** | **Cảnh báo** — **không chặn** submit |
| **Gọi khi nào** | Sau khi user chọn ảnh + pin bản đồ, **trước** `POST /v1/reports` |
| **Quyết định UI** | Dùng field `data.shouldWarn` (không tự tính lại khoảng cách trên FE) |
| **Idempotency** | Không hỗ trợ idempotency key |

> **Ghi chú path:** Controller BE khai báo `[Route("v1/reports")]`. Nếu gateway/proxy của team thêm prefix `/api`, path đầy đủ là `POST /api/v1/reports/check-exif-location`. Mobile nên dùng **cùng base URL** với các API report khác (xem `docs/MOBILE_AUTH_INTEGRATION.md`).

---

## 1. Vì sao cần API này?

Khi citizen tạo báo cáo, app cho phép:

1. Chọn **vị trí trên bản đồ** (`latitude`, `longitude` submit).
2. Đính kèm **ảnh chụp thực tế** (có thể chứa GPS EXIF khác với pin map).

BE vẫn **cho phép submit** ngay cả khi lệch vị trí — officer sẽ thấy flag `EXIF_GPS_MISMATCH` (BR-REP-011). API này giúp Mobile **cảnh báo sớm** để user xác nhận lại pin hoặc chụp lại ảnh, giảm báo cáo nghi ngờ.

```text
Chọn ảnh → (upload R2 / analyze) → User kéo pin map
       → POST check-exif-location
       → shouldWarn=true? → Dialog cảnh báo (user vẫn có thể tiếp tục submit)
       → POST /v1/reports
```

**Không thay thế** validation submit — submit vẫn tự kiểm EXIF riêng.

---

## 2. Request

### 2.1 HTTP

```http
POST /v1/reports/check-exif-location
Authorization: Bearer {accessToken}
Content-Type: application/json
Accept-Language: vi-VN
```

### 2.2 Body (JSON — camelCase)

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `latitude` | number (decimal) | Có | Vĩ độ pin map user chọn (BR-REP-003: **8.0 – 24.0**) |
| `longitude` | number (decimal) | Có | Kinh độ pin map (**102.0 – 110.0**) |
| `tempImageId` | string (32 ký tự) | Một trong hai nguồn ảnh | ID tạm từ `POST /v1/reports/analyze` hoặc `analyze-uploaded` (TTL **15 phút**) |
| `publicUrl` | string | Nguồn R2 | URL public sau presign upload |
| `key` | string | Nguồn R2 | Object key R2 (từ presign response) |
| `fileName` | string | Nguồn R2 | Tên file gốc |
| `contentType` | string | Nguồn R2 | `image/jpeg`, `image/png`, `image/webp`, `image/heic` |
| `sizeBytes` | number (int64) | Nguồn R2 | Kích thước file đã upload — **phải khớp** object trên R2 |

### 2.3 Quy tắc nguồn ảnh (chọn **một**)

**Cách A — AI flow (khuyến nghị sau analyze):**

```json
{
  "latitude": 10.7769,
  "longitude": 106.7009,
  "tempImageId": "a1b2c3d4e5f6789012345678901234ab"
}
```

- Lấy `tempImageId` từ `data.tempImageId` của `POST /v1/reports/analyze-uploaded`.
- Không gửi thêm `publicUrl`, `key`, … khi đã có `tempImageId`.

**Cách B — Presign R2 (không qua analyze, hoặc re-check sau khi đổi pin):**

```json
{
  "latitude": 10.7769,
  "longitude": 106.7009,
  "publicUrl": "https://…/reports/images/…",
  "key": "reports/images/…",
  "fileName": "IMG_001.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 2456789
}
```

- Metadata R2 lấy từ bước `POST /v1/media/presign` + `PUT` upload (xem `docs/mobile-presign-r2-upload-migration.md`).

**Validation lỗi 400 nếu:**

- Thiếu cả `tempImageId` lẫn bộ R2 metadata.
- `tempImageId` không đúng 32 ký tự.
- GPS ngoài biên Việt Nam.
- `contentType` / extension không thuộc jpg, png, webp, heic.
- `sizeBytes` vượt giới hạn ảnh hệ thống (admin setting `max_image_size_mb`).

---

## 3. Response thành công (200)

Envelope chuẩn GreenLens:

```json
{
  "code": "SUCCESS",
  "message": "OK",
  "status": 200,
  "data": {
    "hasExifGps": true,
    "exifLatitude": 10.79362,
    "exifLongitude": 106.714308,
    "selectedLatitude": 10.7769,
    "selectedLongitude": 106.7009,
    "distanceMeters": 1847.52,
    "thresholdMeters": 200,
    "shouldWarn": true
  }
}
```

### 3.1 Ý nghĩa từng field `data`

| Field | Type | Ý nghĩa |
|-------|------|---------|
| `hasExifGps` | boolean | Ảnh có đọc được GPS từ EXIF hay không |
| `exifLatitude` | number \| null | Vĩ độ EXIF (null nếu không có) |
| `exifLongitude` | number \| null | Kinh độ EXIF |
| `selectedLatitude` | number | Echo lại `latitude` request (pin map) |
| `selectedLongitude` | number | Echo lại `longitude` request |
| `distanceMeters` | number \| null | Khoảng cách Haversine (mét) giữa pin và EXIF; **null** khi `hasExifGps=false` |
| `thresholdMeters` | number | Ngưỡng hiện tại từ admin (`exif_gps_mismatch_meters`) |
| `shouldWarn` | boolean | **`true`** khi `hasExifGps` và `distanceMeters > thresholdMeters` |

### 3.2 Logic UI Mobile (bắt buộc)

```text
if (!data.hasExifGps) {
  // Không có EXIF GPS — không cảnh báo lệch vị trí (có thể bỏ qua hoặc hint chụp lại với GPS bật)
  continue submit flow
}

if (data.shouldWarn) {
  show dialog:
    - Tiêu đề gợi ý: "Ảnh có thể không phản ánh hiện trạng thực tế"
    - Nội dung: pin map vs vị trí trong ảnh lệch ~{round(distanceMeters)}m (ngưỡng {thresholdMeters}m)
    - Primary: "Chỉnh lại vị trí" / "Chụp lại ảnh"
    - Secondary: "Vẫn gửi báo cáo"  ← submit vẫn hợp lệ
} else {
  continue submit flow
}
```

**Không** map `shouldWarn` thành HTTP error — 200 với `shouldWarn=true` là kết quả bình thường.

Message officer-facing trên BE (tham khảo copy tiếng Việt): *"Vị trí người dân gửi báo cáo trên bản đồ khác với vị trí trong ảnh"*.

---

## 4. Lỗi thường gặp

| HTTP | `code` | Khi nào | Gợi ý xử lý Mobile |
|------|--------|---------|---------------------|
| 400 | *(validation)* | GPS ngoài VN, thiếu nguồn ảnh, sai content-type, size quá lớn | Hiện `message` từ API; sửa input |
| 400 | `TEMP_IMAGE_NOT_FOUND` | `tempImageId` hết hạn (>15 phút) hoặc không tồn tại | Bắt analyze/upload lại |
| 400 | `INVALID_STORAGE_URL` | `publicUrl`/`key` không thuộc R2 hệ thống | Kiểm tra presign response |
| 400 | `UPLOAD_METADATA_MISMATCH` | `sizeBytes` không khớp file trên R2 | Gửi lại đúng size sau PUT |
| 404 | `UPLOAD_NOT_FOUND` | Object R2 chưa upload / key sai | Presign + PUT lại trước khi check |
| 401 | — | Token hết hạn / không phải Citizen | Refresh token / đăng nhập lại |

Ví dụ lỗi validation:

```json
{
  "code": "TEMP_IMAGE_NOT_FOUND",
  "message": "Phiên upload ảnh không tồn tại hoặc đã hết hạn (15 phút). Vui lòng upload lại.",
  "status": 400,
  "data": null
}
```

---

## 5. Luồng tích hợp đề xuất

### 5.1 Citizen + AI classify (flow mới — presign)

```text
1. POST /v1/media/presign
2. PUT  {uploadUrl}  → R2
3. POST /v1/reports/analyze-uploaded  → tempImageId + gợi ý category
4. User chỉnh pin map (latitude/longitude)
5. POST /v1/reports/check-exif-location  { latitude, longitude, tempImageId }
6. Nếu shouldWarn → dialog; user xác nhận
7. POST /v1/reports  { ..., tempImageId, latitude, longitude }
```

### 5.2 Citizen manual (không AI)

```text
1. POST /v1/media/presign + PUT R2
2. User chọn pin map
3. POST /v1/reports/check-exif-location  { latitude, longitude, publicUrl, key, fileName, contentType, sizeBytes }
4. POST /v1/reports  { images: [{ url, mimeType, sizeBytes }], latitude, longitude, ... }
```

### 5.3 Re-check khi user đổi pin sau analyze

Nếu user **kéo lại pin** sau bước 5, gọi lại `check-exif-location` với `latitude`/`longitude` mới — **cùng** `tempImageId` hoặc metadata R2 cũ.

---

## 6. Ví dụ curl

**AI flow:**

```bash
curl -X POST "https://api-dev.greenlens.com.vn/v1/reports/check-exif-location" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 10.7769,
    "longitude": 106.7009,
    "tempImageId": "a1b2c3d4e5f6789012345678901234ab"
  }'
```

**Presign flow:**

```bash
curl -X POST "https://api-dev.greenlens.com.vn/v1/reports/check-exif-location" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 10.7769,
    "longitude": 106.7009,
    "publicUrl": "https://cdn.example/reports/images/abc.jpg",
    "key": "reports/images/abc.jpg",
    "fileName": "photo.jpg",
    "contentType": "image/jpeg",
    "sizeBytes": 1234567
  }'
```

---

## 7. TypeScript (tham khảo)

```typescript
type CheckExifLocationRequest =
  | {
      latitude: number;
      longitude: number;
      tempImageId: string;
    }
  | {
      latitude: number;
      longitude: number;
      publicUrl: string;
      key: string;
      fileName: string;
      contentType: string;
      sizeBytes: number;
    };

type CheckExifLocationData = {
  hasExifGps: boolean;
  exifLatitude: number | null;
  exifLongitude: number | null;
  selectedLatitude: number;
  selectedLongitude: number;
  distanceMeters: number | null;
  thresholdMeters: number;
  shouldWarn: boolean;
};

type ApiEnvelope<T> = {
  code: string;
  message: string;
  status: number;
  data: T | null;
};
```

---

## 8. FAQ / lưu ý triển khai

| Câu hỏi | Trả lời |
|---------|---------|
| API có chặn submit không? | **Không.** Chỉ trả `shouldWarn` để UI quyết định. |
| Có cần gọi khi submit nhiều ảnh? | Hiện tại API nhận **một** ảnh / request. Gọi với **ảnh đại diện chính** (ảnh đầu tiên hoặc ảnh dùng cho AI). |
| Ảnh không có EXIF GPS? | `hasExifGps=false`, `shouldWarn=false` — không hiện dialog lệch vị trí. |
| Ngưỡng 200m cố định? | **Không** — BE trả `thresholdMeters` theo admin; có thể thay đổi runtime (cache ~60s). |
| Khác `progress_update_max_distance_meters`? | **Có.** Setting này chỉ cho check EXIF citizen submit; progress update dùng setting riêng. |
| Timeout gợi ý client? | 15–30s (BE có thể tải ảnh từ R2 hoặc temp store). |
| Cần idempotency key? | Không. |

---

## 9. Liên quan trong repo

| Tài liệu / code | Nội dung |
|-----------------|----------|
| `docs/mobile-presign-r2-upload-migration.md` | Presign + `analyze-uploaded` |
| `docs/mobile-report-image-upload-flow-and-troubleshooting.md` | Flow ảnh citizen tổng quan |
| `docs/CREATE_POLLUTION_REPORT_FLOW.md` | Submit report |
| `src/Greenlens.Api/Controllers/ReportsController.cs` | Endpoint HTTP |
| `src/Greenlens.Application/Features/Reports/CheckExifLocation/` | Command / handler / validator |

---

## 10. Checklist Mobile trước khi merge

- [ ] Gọi API sau khi có ảnh **và** tọa độ pin map cuối cùng.
- [ ] Xử lý `shouldWarn` bằng dialog — không block cứng.
- [ ] Re-check khi user kéo pin sau lần check đầu.
- [ ] Handle `TEMP_IMAGE_NOT_FOUND` → quay lại analyze/upload.
- [ ] Hiển thị `message` từ API khi 4xx (không hard-code code cũ).
- [ ] Dùng `thresholdMeters` / `distanceMeters` từ response (không hard-code 200m).
