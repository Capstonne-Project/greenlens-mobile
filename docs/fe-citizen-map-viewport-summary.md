# Citizen Home — Card "Khu vực đang xem" (FE guide)

Tài liệu cho **mobile/web FE** gọi API thống kê vùng map trên **Trang chủ** (thay metric **hotspot** bằng **số báo cáo** + biểu đồ theo ngày).

> **Liên quan:** Load pin map → [`PUBLIC_MAP_VIEWPORT_PLAN.md`](./PUBLIC_MAP_VIEWPORT_PLAN.md), `GET /v1/map/reports`.  
> Chi tiết pin → [`fe-citizen-map-report-detail.md`](./fe-citizen-map-report-detail.md).

---

## 1. Thay đổi UI (mock → production)

| Trước (mock) | Sau (API) |
|--------------|-----------|
| `5 báo cáo · 3 hotspot · 30 ngày qua` | `{reportCount} báo cáo · {days} ngày qua` |
| Chart mock | `dailyCounts[]` từ API |

**Bỏ hoàn toàn** chữ "hotspot" trên card — backend **không** có API hotspot trong phase này.

---

## 2. Khi nào gọi API

Gọi **`GET /v1/map/summary`** cùng lúc (hoặc ngay sau) **`GET /v1/map/reports`** khi:

- User **pan / zoom** map trên Home
- User đổi **filter category** (chip "Tất cả", "Rác thải sinh hoạt", …)

**Debounce** bbox giống load pin (khuyến nghị 300–500 ms) để tránh spam request.

**Auth:** Không cần JWT (`AllowAnonymous`).

---

## 3. Endpoint

```http
GET /v1/map/summary?minLat={}&maxLat={}&minLng={}&maxLng={}&days=30&categoryId={optional}
Accept-Language: vi-VN
```

### Query parameters

| Param | Bắt buộc | Mặc định | Mô tả |
|-------|----------|----------|--------|
| `minLat`, `maxLat`, `minLng`, `maxLng` | Có | — | **Cùng bbox** đang gửi cho `GET /map/reports` |
| `days` | Không | `30` | Khoảng thống kê (min **7**, max **90**) |
| `categoryId` | Không | — | UUID danh mục; khớp filter chip map |

### Ví dụ

```http
GET /v1/map/summary?minLat=10.75&maxLat=10.85&minLng=106.60&maxLng=106.72&days=30
```

---

## 4. Response envelope

Theo [`00_API_CONVENTIONS.md`](../00_API_CONVENTIONS.md):

```json
{
  "code": "SUCCESS",
  "message": "OK",
  "status": 200,
  "data": {
    "reportCount": 5,
    "days": 30,
    "periodStart": "2026-05-02",
    "periodEnd": "2026-06-01",
    "dailyCounts": [
      { "date": "2026-05-02", "count": 0 },
      { "date": "2026-05-03", "count": 1 },
      { "date": "2026-06-01", "count": 2 }
    ]
  }
}
```

### Field `data`

| Field | Kiểu | UI |
|-------|------|-----|
| `reportCount` | int | Dòng chữ: **"{n} báo cáo"** |
| `days` | int | **"· {days} ngày qua"** |
| `periodStart`, `periodEnd` | `YYYY-MM-DD` | Nhãn chart: trái = `periodStart`, phải = `periodEnd` (hoặc copy "30 ngày trước" / "Hôm nay") |
| `dailyCounts` | array | **Mỗi phần tử = 1 cột** biểu đồ |
| `dailyCounts[].date` | date | Trục X (có thể chỉ hiện label đầu/cuối) |
| `dailyCounts[].count` | int | Chiều cao cột (`0` vẫn vẽ cột thấp hoặc gap) |

**Độ dài `dailyCounts`:** Luôn bằng `days` (đủ từng ngày, kể cả `count: 0`).

### Quy tắc đếm (để copy UX / FAQ)

- Chỉ báo cáo **công khai** (status ≥ Verified, cùng rule `GET /map/reports`).
- Trong **bbox** hiện tại.
- `createdAt` nằm trong **`days`** ngày gần nhất (UTC, tính theo **ngày lịch**).
- `reportCount` = **tổng thật** trong điều kiện trên (không bị cap 200 như `GET /map/reports?mode=detail`).

---

## 5. Gắn vào card "Khu vực đang xem"

```
┌─────────────────────────────────────┐
│ Khu vực đang xem      Xem tất cả >  │  ← "Xem tất cả": navigate list/filter (tuỳ design)
│ {reportCount} báo cáo · {days} ngày qua
│ ▁▂▃▅▇█  (dailyCounts → bar chart)
│ {periodStart label}    {periodEnd label}
└─────────────────────────────────────┘
```

**Pseudo-code:**

```ts
const bbox = map.getBounds(); // same as map/reports

const [reportsRes, summaryRes] = await Promise.all([
  api.get('/v1/map/reports', { params: { ...bbox, mode: 'detail', categoryId } }),
  api.get('/v1/map/summary', { params: { ...bbox, days: 30, categoryId } }),
]);

const { reportCount, days, dailyCounts, periodStart, periodEnd } = summaryRes.data;
const subtitle = `${reportCount} báo cáo · ${days} ngày qua`;
// chart: dailyCounts.map(d => ({ x: d.date, y: d.count }))
```

**Loading:** Skeleton card khi đang fetch; giữ số cũ nếu request lỗi (optional).

---

## 6. Lỗi

| HTTP | `code` | Xử lý FE |
|------|--------|----------|
| 422 | `VALIDATION_ERROR` | Bbox quá rộng → zoom in (cùng message map/reports) |
| 404 | `CATEGORY_NOT_FOUND` | Reset filter "Tất cả" |
| 5xx | — | Ẩn chart hoặc placeholder; pin map vẫn có thể hiện từ `/map/reports` |

---

## 7. So sánh với `GET /map/reports`

| | `/map/reports` | `/map/summary` |
|--|----------------|----------------|
| Mục đích | Pin + preview trên map | Card thống kê + chart |
| Trả về | Danh sách pin (cap limit) | `reportCount` + `dailyCounts` |
| Lọc thời gian | Không | `days` (default 30) |
| Gọi song song | Có | Có |

---

## 8. Test checklist (FE)

| # | Case | Expected |
|---|------|----------|
| 1 | Pan map | Summary + pins cùng bbox |
| 2 | Zoom xa (bbox lớn) | 422 — không crash |
| 3 | Filter category | `categoryId` gửi cả 2 API |
| 4 | `dailyCounts` | Đúng `days` phần tử |
| 5 | Vùng không có báo cáo | `reportCount: 0`, chart toàn 0 |
| 6 | Đổi `days=7` | Subtitle "7 ngày qua", 7 cột |

---

## 9. Swagger

`GET /v1/map/summary` — tag **Map — Public Map**, cùng controller với `GET /v1/map/reports`.

---

**Phiên bản:** 1.0 — 2026-06-01  
**Backend:** `MapController.GetViewportSummaryAsync`, slice `GetMapViewportSummary`.
