# Kế hoạch: Map công khai — điểm ô nhiễm theo khung nhìn (BE + FE)

Tài liệu dùng chung cho **backend** và **frontend (React Native)** để cùng hiểu phạm vi, contract và thứ tự làm việc.

---

## 1. Mục tiêu sản phẩm

- Người dùng xem **bản đồ công khai** và thấy các **điểm báo cáo ô nhiễm** nằm trong **vùng họ đang nhìn** (viewport).
- **Chỉ hiển thị báo cáo đã qua xác minh:** trạng thái **Verified trở đi** (Verified, InProgress, Resolved, Closed — **không** hiển thị Submitted, Rejected, Duplicate trừ khi có quyết định BR riêng).
- **Không** dùng query theo **bán kính / vòng tròn** cho use case chính; dùng **bounding box** (bốn giới hạn lat/lng) do client gửi từ khung map.
- **Theo mức zoom:**
  - **Zoom gần (bbox nhỏ):** hiển thị **chi tiết** — từng điểm (marker).
  - **Zoom xa (bbox lớn):** hiển thị **tổng quan** — gom nhóm / ô lưới, **nhấn mạnh theo severity** (ít chi tiết địa điểm, tránh nghìn marker).

---

## 2. Phạm vi phiên bản

| Thành phần | Trong plan này |
|------------|----------------|
| API đọc báo cáo trong bbox + filter trạng thái | Có |
| Hai chế độ: **detail** vs **aggregate** (gom ô / severity) | Mục tiêu; có thể chia phase (xem mục 8) |
| Làm tròn tọa độ public (BR-MAP-004) | Có trong contract BE |
| Redis cache / ETag | Phase sau (ghi trong roadmap) |
| FE: debounce, cache cục bộ, cluster | Có |

---

## 3. Backend (GreenLens) — làm gì

### 3.1 Endpoint (đề xuất)

- **`GET /v1/map/reports`** (hoặc `/v1/map/incidents-in-view` — chốt một tên và giữ vĩnh viễn).

### 3.2 Query parameters

| Param | Bắt buộc | Mô tả |
|-------|-----------|--------|
| `minLat`, `maxLat`, `minLng`, `maxLng` | Có | Khung nhìn; validate min/max và biên Việt Nam (BR-REP-003 khi áp dụng cho bbox). |
| `mode` | Khuyến nghị | `detail` \| `aggregate`. Mặc định có thể là `detail`. |
| `limit` | Khuyến nghị | Trần số điểm trả về ở mode `detail` (vd. default 200, max 500). |
| `gridLevel` hoặc `cellSizeDeg` | Khi `aggregate` | Độ phân ô lưới để gom điểm. |
| `categoryId` | Optional | Lọc loại ô nhiễm nếu có filter UI. |

### 3.3 Logic nghiệp vụ

- Lọc **`Report.Status`** ∈ { Verified, InProgress, Resolved, Closed } (danh sách chính xác **phải khớp BR doc** và được ghi trong handler XML).
- Filter vị trí: `latitude` / `longitude` nằm trong bbox (schema hiện tại dùng decimal; sau có thể nâng PostGIS).
- **Giới hạn bbox:** từ chối hoặc trả lỗi validation nếu bbox quá rộng (tránh quét cả nước một query).
- **Mode `detail`:** projection DTO mỏng: `id`, `code` (nếu public), `latitude`, `longitude` (**đã làm tròn** theo BR-MAP-004), `severity`, nhãn category tối thiểu, `createdAt` (optional).
- **Mode `aggregate`:** nhóm theo ô lưới trong bbox; mỗi ô: `cellKey` hoặc `centerLat`/`centerLng`, `count`, phân bố hoặc **`maxSeverity`** (để FE tô màu theo mức nghiêm trọng).

### 3.4 Kỹ thuật & chất lượng

- Handler có **XML remarks** + BR-ID (BR-MAP-*, BR-REP-003, BR-MAP-004, …).
- **`AsNoTracking`**, không hydrate full entity khi chỉ cần map pin.
- **FluentValidation** cho bbox và limit.
- **Unit test** validator; **integration test** (Testcontainers) cho query khi có DB.
- **AllowAnonymous** cho GET map công khai (giảm phụ thuộc JWT cho thao tác pan).

### 3.5 Hiệu năng (roadmap sau MVP)

- Redis cache key theo bbox đã **quantize** + mode + filter (TTL ~10 phút — khớp rule dự án).
- **ETag / 304** cho client có cache HTTP.

---

## 4. Frontend (React Native + `react-native-maps`) — làm gì

### 4.1 Gửi bbox lên BE

- Từ **`MapView`** (`react-native-maps`): dùng **`onRegionChangeComplete`** → nhận `region` (center + `latitudeDelta` / `longitudeDelta`) → suy ra bbox **min/max lat/lng** (cùng công thức với `src/utils/map-viewport.ts` `regionToBBox`).
- **Debounce** (vd. 400–600 ms) trước khi gọi API.
- **Làm tròn nhẹ** bbox trước khi so sánh / gọi API để tránh hai request trùng vùng do noise.

### 4.2 Chọn mode theo zoom / diện tích bbox

- Khi **diện tích bbox nhỏ** (zoom gần) → `mode=detail` + `limit` hợp lý.
- Khi **bbox lớn** (zoom xa) → `mode=aggregate` (hoặc tạm thời vẫn `detail` + **cluster** trên SDK nếu BE chưa có aggregate).

### 4.3 Tối ưu số lần gọi

- Không gọi lại nếu bbox **gần như không đổi** (so hash bbox đã làm tròn).
- **Cache cục bộ** (memory/MMKV) theo key `mode + bbox + filter`, TTL ngắn (2–5 phút).
- Tránh **remount** `MapView` không cần thiết (giảm tải tile map provider).

### 4.4 Hiển thị

- **Detail:** marker / symbol theo severity (màu hoặc icon).
- **Aggregate:** layer ô lưới / heat / bubble theo `count` và **severity** từ response.
- Tuân **privacy:** không hiển thị địa chỉ đầy đủ trên pin public nếu BR cấm.

### 4.5 Expo / map native

- **Implementation hiện tại (GreenLens mobile):** `react-native-maps` — chạy trên **Expo Go** và bản build có native (`expo run:*`, EAS).
- **Không** dùng `@rnmapbox/maps` trong repo; **không** gắn **Goong Maptiles style URL** vào `MapView` (nền là Apple / Google theo nền tảng).
- **Goong:** vẫn có thể dùng **REST API** (Geocode, …) độc lập với component map — xem `docs/ADDRESS_MAP_CATALOG_FLOW.md` §5.4.

---

## 5. Contract response (hình dạng dữ liệu)

### 5.1 `mode=detail` — ví dụ `data`

```json
{
  "items": [
    {
      "id": "uuid",
      "code": "RPT-…",
      "latitude": 10.7623,
      "longitude": 106.6601,
      "severity": "High",
      "categoryCode": "TRASH",
      "status": "Verified"
    }
  ],
  "meta": { "limit": 200, "returned": 42 }
}
```

*(Field chính xác do team chốt trong DTO; latitude/longitude đã làm tròn phía BE.)*

### 5.2 `mode=aggregate` — ví dụ `data`

```json
{
  "cells": [
    {
      "centerLat": 10.76,
      "centerLng": 106.66,
      "count": 15,
      "maxSeverity": "Critical"
    }
  ],
  "meta": { "gridLevel": 2 }
}
```

---

## 6. Lỗi & validation

- Bbox không hợp lệ → **422** + mã lỗi chuẩn envelope.
- Bbox vượt ngưỡng diện tích → **422** hoặc **400** (chốt một).

---

## 7. Trách nhiệm rõ ràng

| Hạng mục | Owner chính |
|----------|-------------|
| Endpoint, validator, DTO, filter status, làm tròn tọa độ | BE |
| Debounce, bbox từ map, gọi API, cache FE, cluster/aggregate UI | FE |
| BR doc / acceptance “Verified+” | PO + cả hai team review handler |

---

## 8. Thứ tự triển khai đề xuất

1. **M1 — MVP:** `GET` bbox + `mode=detail` + limit + status Verified+ + validator + test validator (+ integration test nếu kịp).
2. **M2:** `mode=aggregate` + tham số lưới + test.
3. **M3:** Redis cache bbox (BE) + cache MMKV (FE).
4. **M4:** ETag / 304 (tuỳ cần).

---

## 9. Tài liệu liên quan trong repo

- BR traceability: handlers gắn BR-MAP-*, BR-REP-003, BR-MAP-004.
- Map flow địa chỉ form: `docs/ADDRESS_MAP_CATALOG_FLOW.md` (catalog tỉnh/phường — khác với map public báo cáo).

---

## 10. Checklist trước khi merge

- [ ] BR-ID trên handler + test có suffix BR-ID.
- [ ] Không trả PII không cần thiết trên API map public.
- [ ] Pagination/limit — không list vô hạn.
- [ ] FE không spam API khi pan liên tục (debounce đã có trong plan).

---

## 11. Trạng thái triển khai backend (đã có trong repo)

| Thành phần | Vị trí |
|------------|--------|
| **GET** `/v1/map/reports` | `Greenlens.Api/Controllers/MapController.cs` |
| Query + handler | `Greenlens.Application/Features/Map/GetPublicMapReports/*` |
| Giới hạn bbox / limit | `Greenlens.Application/Common/Map/PublicMapQueryLimits.cs` |
| Làm tròn tọa độ public | `Greenlens.Application/Common/Map/PublicMapCoordinateRounding.cs` |
| Lỗi map (dự phòng) | `Errors.Map.*` trong `Greenlens.Application/Common/Errors.cs` |

**Tham số:** `minLat`, `maxLat`, `minLng`, `maxLng`, `mode` (`detail` \| `aggregate`), `limit` (detail, default 200, max 500), `gridLevel` (aggregate, 1–5, default 3), `categoryId` (optional).

**Trạng thái hiển thị:** Verified, InProgress, Resolved, Closed.

**Chưa làm (roadmap):** Redis cache bbox, ETag, PostGIS envelope (tùy tải).

---

*Phiên bản: 1.2 — FE map: `react-native-maps` + bbox qua `onRegionChangeComplete`; đã gắn endpoint BE.*
