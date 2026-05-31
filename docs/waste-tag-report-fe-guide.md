# Waste Tag — Hướng dẫn tích hợp vào màn hình tạo Report

Khi citizen tạo báo cáo ô nhiễm, FE cần hiển thị danh sách **loại rác thải** để user chọn (có thể chọn nhiều). Dữ liệu này được gửi kèm lúc submit report.

---

## 1. Lấy danh sách Waste Tag

Gọi **trước khi** mở màn hình tạo report (load 1 lần, cache lại):

```
GET /v1/waste-tags
Authorization: Bearer {token}
```

**Response:**
```json
{
  "tags": [
    {
      "id": "uuid",
      "code": "HOUSEHOLD",
      "nameVi": "Rác sinh hoạt",
      "nameEn": "Household Waste",
      "iconUrl": "https://...",
      "description": "...",
      "displayOrder": 1
    },
    ...
  ]
}
```

**12 tag hiện có (theo thứ tự `displayOrder`):**

| displayOrder | code | nameVi |
|---|---|---|
| 1 | `HOUSEHOLD` | Rác sinh hoạt |
| 2 | `FOOD_ORGANIC` | Thực phẩm & Hữu cơ |
| 3 | `RECYCLABLE` | Tái chế |
| 4 | `MEDICAL` | Rác y tế |
| 5 | `ELECTRONIC` | Rác điện tử |
| 6 | `HAZARDOUS` | Nguy hại |
| 7 | `CONSTRUCTION` | Phế thải xây dựng |
| 8 | `BULKY` | Đồ cồng kềnh |
| 9 | `TIRE` | Lốp xe |
| 10 | `ANIMAL_CARCASS` | Xác động vật |
| 11 | `TEXTILE` | Vải, quần áo |
| 12 | `VEGETATION` | Cây cỏ, lá |

> Dùng `iconUrl` nếu có để hiển thị icon. Dùng `nameVi` làm label chính.

---

## 2. Submit Report kèm Waste Tag

```
POST /v1/reports
Authorization: Bearer {token}
Content-Type: application/json
```

**Request body:**
```json
{
  "categoryId": "uuid",
  "severity": "Medium",
  "description": "Mô tả điểm ô nhiễm...",
  "latitude": 21.0285,
  "longitude": 105.8542,
  "address": "Số 1 Hoàng Diệu, Hà Nội",
  "wardCode": "00004",
  "provinceCode": "01",
  "tempImageId": "temp_abc123",
  "wasteTagIds": [
    "uuid-of-HOUSEHOLD-tag",
    "uuid-of-RECYCLABLE-tag"
  ]
}
```

> `wasteTagIds` là array **ID (uuid)** của tag, **không phải** `code`. Lấy `id` từ response của `GET /v1/waste-tags`.

---

## 3. Validation rules (FE cần tự check trước khi submit)

| Rule | Chi tiết |
|---|---|
| Số lượng tag | Tối đa **10 tag**, tối thiểu **0** (không bắt buộc) |
| Không trùng | Mỗi tag chỉ được chọn 1 lần |
| `wasteTagIds` rỗng | Bỏ qua hoặc gửi `[]` đều được — BE xử lý như nhau |

---

## 4. Gợi ý UI

### Hiển thị dạng chip/tag multi-select:

```
┌─────────────────────────────────────────────────┐
│  Loại rác thải (tùy chọn, chọn tối đa 10)      │
│                                                 │
│  [🏠 Rác sinh hoạt ✓] [🍎 Thực phẩm]          │
│  [♻️ Tái chế ✓]       [💊 Rác y tế]            │
│  [💻 Rác điện tử]     [⚠️ Nguy hại]            │
│  [🧱 Phế thải XD]     [🛋️ Đồ cồng kềnh]        │
│  [🚗 Lốp xe]          [🐾 Xác động vật]         │
│  [👕 Vải, quần áo]    [🌿 Cây cỏ, lá]          │
└─────────────────────────────────────────────────┘
```

### Logic:
- Tap vào tag → toggle selected/unselected
- Đã chọn 10 tag → disable các tag chưa chọn, hiện thông báo "Đã đạt giới hạn 10 loại"
- Khi submit → lấy `id` của các tag đang selected, đưa vào `wasteTagIds`

---

## 5. Flow đầy đủ

```
Mở màn hình tạo Report
        │
        ▼
GET /v1/waste-tags ──► Lưu vào state, render chip list
        │
        ▼
User điền thông tin + chọn waste tags
        │
        ▼
POST /v1/reports
  body.wasteTagIds = [id1, id2, ...]
        │
        ▼
201 Created ──► Chuyển sang màn hình chi tiết report
```

---

## 6. Hiển thị Waste Tag trên màn hình chi tiết Report

Khi GET report detail, response trả về mảng `wasteTags` kèm theo:

```json
{
  "id": "report-uuid",
  "wasteTags": [
    { "id": "uuid", "code": "HOUSEHOLD", "nameVi": "Rác sinh hoạt", "iconUrl": "..." },
    { "id": "uuid", "code": "RECYCLABLE", "nameVi": "Tái chế", "iconUrl": "..." }
  ]
}
```

Render dưới dạng chip read-only trong màn hình chi tiết.
