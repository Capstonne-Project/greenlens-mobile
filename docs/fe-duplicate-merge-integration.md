# Mobile App — Duplicate Report Merge Integration Guide

> **Backend branch:** `develop`
> **Ngày cập nhật:** 2026-07-23
> **Liên quan:** BR-REP-031, BR-REP-032, BR-NTF-002

---

## 1. Thay đổi API: `GET /v1/reports/my`

### 2 field mới trong `MyReportItem`

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| `mergedIntoPrimaryReportId` | `Guid?` | ✅ | ID của báo cáo gốc mà báo cáo này đã được gộp vào. `null` nếu không phải duplicate. |
| `mergedIntoPrimaryReportCode` | `string?` | ✅ | Mã hiển thị của báo cáo gốc (e.g. `RPT-2026-0045`). `null` nếu không phải duplicate. |

### Response mẫu

```json
{
  "data": {
    "items": [
      {
        "id": "d1a2b3c4-...",
        "code": "RPT-2026-0048",
        "categoryName": "Ô nhiễm rác thải",
        "severity": "Medium",
        "status": "Duplicate",
        "address": "125 Nguyễn Huệ, P. Bến Thành, Q.1",
        "createdAt": "2026-07-22T14:30:00Z",
        "resolvedAt": null,
        "closedAt": null,
        "imageUrl": "https://cdn.example.com/img/thumb_abc.jpg",
        "mergedIntoPrimaryReportId": "a1b2c3d4-...",
        "mergedIntoPrimaryReportCode": "RPT-2026-0045"
      },
      {
        "id": "e5f6g7h8-...",
        "code": "RPT-2026-0050",
        "categoryName": "Ô nhiễm nước",
        "severity": "High",
        "status": "Submitted",
        "address": "456 Trần Hưng Đạo, Q.5",
        "createdAt": "2026-07-22T16:00:00Z",
        "resolvedAt": null,
        "closedAt": null,
        "imageUrl": "https://cdn.example.com/img/thumb_xyz.jpg",
        "mergedIntoPrimaryReportId": null,
        "mergedIntoPrimaryReportCode": null
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "totalCount": 2, "totalPages": 1 }
  }
}
```

### Hướng dẫn UI

```
┌──────────────────────────────────────────────────────────────┐
│  📋 Báo cáo của tôi                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  RPT-2026-0050  |  🟠 Cao  |  Ô nhiễm nước                  │
│  456 Trần Hưng Đạo, Q.5                                     │
│  Status: Submitted                                           │
│                                                              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                              │
│  RPT-2026-0048  |  🟡 TB   |  Ô nhiễm rác thải              │
│  125 Nguyễn Huệ, P. Bến Thành                               │
│  Status: Đã gộp                                              │
│  ↗ Theo dõi tiến độ tại RPT-2026-0045  ← CLICKABLE LINK     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Logic hiển thị:**

```
if (item.status == "Duplicate" && item.mergedIntoPrimaryReportId != null) {
    // Hiện badge "Đã gộp" thay vì "Duplicate"
    // Hiện link "Theo dõi tiến độ tại {mergedIntoPrimaryReportCode}"
    // Khi tap link → navigate to ReportDetail(mergedIntoPrimaryReportId)
}
```

---

## 2. Thay đổi Notification

### Trước (cũ)

```json
{
  "type": "ReportStatusChanged",
  "title": "Báo cáo được gộp",
  "message": "Báo cáo của bạn đã được xác định là trùng lặp và gộp vào một báo cáo hiện có. Cảm ơn đóng góp của bạn!",
  "referenceId": "d1a2b3c4-..."
}
```

> `referenceId` trỏ đến báo cáo **bị duplicate** (báo cáo của citizen)

### Sau (mới)

```json
{
  "type": "ReportStatusChanged",
  "title": "Báo cáo được gộp",
  "message": "Báo cáo của bạn đã được xác định là trùng lặp và gộp vào báo cáo RPT-2026-0045. Bạn có thể theo dõi tiến độ xử lý tại báo cáo gốc. Cảm ơn đóng góp của bạn!",
  "referenceId": "a1b2c3d4-..."
}
```

> `referenceId` giờ trỏ đến **báo cáo GỐC (primary)** để mobile deep-link trực tiếp.

### ⚠️ Breaking change: `referenceId`

| | Trước | Sau |
|--|-------|-----|
| `referenceId` trỏ đến | Báo cáo bị duplicate (của citizen) | **Báo cáo gốc (primary)** |

**Lý do:** Mobile cần deep-link vào **báo cáo gốc** để citizen theo dõi tiến độ xử lý, không phải báo cáo đã bị merge.

### Hướng dẫn xử lý notification tap

```
onNotificationTap(notification) {
    if (notification.type == "ReportStatusChanged") {
        // referenceId = primary report ID
        navigateTo(ReportDetailScreen, { reportId: notification.referenceId })
    }
}
```

> **Lưu ý:** Citizen có thể xem được báo cáo gốc vì `GET /v1/reports/{id}` cho phép tất cả user đã đăng nhập xem chi tiết.

---

## 3. Checklist tích hợp

- [x] Cập nhật model `MyReportItem` thêm 2 field mới (`mergedIntoPrimaryReportId`, `mergedIntoPrimaryReportCode`)
- [x] Xử lý UI khi `status == "Duplicate"` → hiện badge "Đã gộp" + link báo cáo gốc
- [x] Cập nhật notification handler: `referenceId` giờ trỏ đến **primary report**
- [x] Deep-link notification tap → `ReportDetailScreen(referenceId)`
- [ ] Test: submit 2 báo cáo cùng vị trí → confirm duplicate → verify notification + my reports
