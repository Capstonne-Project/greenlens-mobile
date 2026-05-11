# GreenLens — Luồng tạo báo cáo ô nhiễm (Create Report)

> Tài liệu cho **frontend** (mobile / web) tích hợp luồng **tạo báo cáo**: chọn ảnh → upload → gửi báo cáo.  
> Chuẩn envelope API: `{ code, message, status, data }` (xem `00_API_CONVENTIONS.md` nếu có trong repo).

---

## 1. Tóm tắt luồng

```text
[1] (Tuỳ chọn) GET catalog tỉnh/phường + chọn địa chỉ / GPS trên map
[2] Với mỗi ảnh: POST /v1/media/reports/images  (multipart)
[3] POST /v1/pollution-reports  (JSON — gắn url + mimeType + sizeBytes từ bước 2)
[4] Hiển thị màn hình thành công từ data trả về (code, SLA, ảnh đã lưu, …)
```

**Thứ tự bắt buộc:** upload ảnh **trước**, submit **sau**. Submit **không** nhận file binary; chỉ nhận URL HTTPS đã upload.

Chi tiết chọn tỉnh / phường / map: `docs/ADDRESS_MAP_CATALOG_FLOW.md`.

---

## 2. Base URL & headers

| Môi trường | Base URL (ví dụ) |
|------------|------------------|
| Local | `http://localhost:5000/v1` |
| Dev / Staging / Prod | Theo cấu hình dự án |

| Header | Khi nào |
|--------|---------|
| `Content-Type: application/json` | Submit báo cáo |
| `Authorization: Bearer {accessToken}` | Khi `isAnonymous: false` (bắt buộc có token hợp lệ) |
| `Accept-Language: vi-VN` hoặc `en-US` | Tuỳ chọn (message lỗi / i18n) |

Upload ảnh: `multipart/form-data`, field file tên **`file`** (theo controller hiện tại).

---

## 3. Bước 1 — Upload từng ảnh

**`POST /v1/media/reports/images`**

- **Auth:** `AllowAnonymous` — không bắt buộc đăng nhập (vẫn nên rate-limit phía client).
- **Body:** `multipart/form-data`, một file ảnh.

**Giới hạn (BE):**

- Loại: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- Tối đa **10 MB** / ảnh

**Response 200** — `data` ví dụ:

```json
{
  "url": "https://…",
  "key": "reports/images/…",
  "message": "Tải ảnh báo cáo thành công.",
  "mimeType": "image/jpeg",
  "sizeBytes": 1234567
}
```

**FE lưu tạm** (mỗi ảnh đã chọn): `url`, `mimeType`, `sizeBytes` — dùng nguyên khi submit.

**Lỗi thường gặp:**

| HTTP | code (ví dụ) | Ý nghĩa |
|------|----------------|---------|
| 400 | `FILE_REQUIRED` | Không gửi file hoặc file rỗng |
| 422 | `INVALID_IMAGE_TYPE` | Sai MIME |
| 422 | `IMAGE_TOO_LARGE` | > 10 MB |
| 500 | `STORAGE_UPLOAD_FAILED` | Lỗi lưu trữ (R2) |

---

## 4. Bước 2 — Chuẩn bị form báo cáo

### 4.1 Trường gửi lên submit

| Field (JSON camelCase) | Bắt buộc | Ghi chú |
|------------------------|----------|---------|
| `categoryId` | Có | `guid` danh mục ô nhiễm **đang active** |
| `severity` | Có | `Low` \| `Medium` \| `High` \| `Critical` |
| `description` | Không | Tối đa 1000 ký tự |
| `latitude` | Có | 8.0 – 24.0 (VN) |
| `longitude` | Có | 102.0 – 110.0 (VN) |
| `address` | Không | Số nhà, đường; tối đa 500 ký tự |
| `provinceCode` | Cặp | 2 chữ số; **cùng có hoặc cùng không** với `wardCode` |
| `wardCode` | Cặp | 5 chữ số; phải thuộc `provinceCode` trong catalog |
| `isAnonymous` | Có | `true`: không gắn reporter; `false`: cần Bearer |
| `images` | Có | Mảng 1–5 phần tử (xem 4.2) |

### 4.2 Mỗi phần tử `images[]`

| Field | Nguồn |
|-------|--------|
| `url` | `data.url` từ upload (HTTPS tuyệt đối) |
| `mimeType` | `data.mimeType` từ upload |
| `sizeBytes` | `data.sizeBytes` từ upload |

**Số ảnh:** tối thiểu **1**, tối đa **5** (BR-REP-001, BR-REP-002).

### 4.3 Danh mục (`categoryId`)

Submit kiểm tra category tồn tại và `isActive`. Hiện **chưa** có endpoint catalog category riêng trong `Greenlens.Api`; FE lấy `categoryId` từ nguồn app đã thống nhất (seed / admin / endpoint danh mục khi có).

### 4.4 Địa chỉ hành chính

- `GET /v1/catalog/provinces`
- `GET /v1/catalog/provinces/{provinceCode}/wards`

Gửi **`provinceCode`** + **`wardCode`** (mã chuẩn), không gửi tên hiển thị thay cho mã.  
Ô `address` = dòng đường / số nhà (text).

---

## 5. Bước 3 — Submit báo cáo

**`POST /v1/pollution-reports`**

- **Auth:** `AllowAnonymous` ở controller; nếu `isAnonymous: false` → BE trả lỗi nếu **không** có user từ JWT (`AUTHENTICATION_REQUIRED`).

**Request body ví dụ:**

```json
{
  "categoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "severity": "High",
  "description": "Rác chất đống nghẹt cống",
  "latitude": 10.8195,
  "longitude": 106.6528,
  "address": "123 Đường ABC",
  "wardCode": "26734",
  "provinceCode": "79",
  "isAnonymous": true,
  "images": [
    {
      "url": "https://cdn.example.com/reports/images/abc.jpg",
      "mimeType": "image/jpeg",
      "sizeBytes": 1234567
    }
  ]
}
```

**Response 201** — `data` gồm (đủ để bind màn “Đã gửi”):

| Field | Ý nghĩa |
|-------|---------|
| `id`, `code` | Định danh báo cáo (vd. `RPT-260511-ABC123`) |
| `category` | `{ id, code, nameVi, nameEn, iconUrl }` |
| `severity`, `description` | Như đã gửi |
| `latitude`, `longitude`, `address`, `wardCode`, `provinceCode` | Vị trí / địa chỉ |
| `isAnonymous`, `reporterId` | `reporterId` null khi ẩn danh |
| `status` | Luôn **`Submitted`** lúc tạo |
| `createdAt` | Thời điểm tạo |
| `slaVerifyDueAt` | Hạn xác minh (~24h từ tạo) |
| `aiPending` | `true` khi mới tạo |
| `images` | `[{ id, url, mimeType, sizeBytes }]` bản ghi đã lưu |

**Lưu ý:** Báo cáo **chưa** hiện trên **map công khai** cho đến khi trạng thái ≥ `Verified` (`GET /v1/map/reports`).

---

## 6. Bảng lỗi submit (tham khảo)

| HTTP | code | Khi nào |
|------|------|---------|
| 422 | `VALIDATION_ERROR` | Sai format / thiếu ảnh / GPS / mã tỉnh-phường / MIME / size ảnh |
| 404 | `CATEGORY_NOT_FOUND` | `categoryId` không tồn tại hoặc không active |
| 422 | `INVALID_WARD_PROVINCE` | Cặp `wardCode` + `provinceCode` không khớp catalog |
| 422 | `AUTHENTICATION_REQUIRED` | `isAnonymous: false` nhưng không đăng nhập |
| 500 | `INTERNAL_ERROR` | Lỗi server |

Validation chi tiết (GPS, cặp mã, HTTPS URL ảnh, …): `SubmitPollutionReportCommandValidator`.

---

## 7. Gợi ý UX / state FE

1. Form local: category, severity, mô tả, GPS, địa chỉ, danh sách ảnh (local URI + metadata sau upload).
2. Upload song song hoặc tuần tự; disable submit khi chưa có ≥ 1 ảnh upload thành công.
3. Submit một lần; loading + chặn double-tap.
4. Thành công: điều hướng màn xác nhận với `data.code`, `slaVerifyDueAt`, `images`.
5. Ẩn danh: `isAnonymous: true`, không gửi Bearer. Có tài khoản: `isAnonymous: false` + Bearer.

---

## 8. Tham chiếu code backend

| Thành phần | Đường dẫn |
|------------|-----------|
| Upload ảnh | `Greenlens.Api/Controllers/MediaController.cs` |
| Submit | `Greenlens.Api/Controllers/PollutionReportsController.cs` |
| Command / Response | `Application/Features/Reports/SubmitPollutionReport/` |
| Upload response | `Application/Features/Media/UploadReportImage/` |
| Catalog địa chỉ | `Application/Features/Catalog/` |

---

*Phiên bản: 1.0 — đồng bộ với API hiện tại trong repo.*
