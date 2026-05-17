# Luồng tạo báo cáo có AI — Hướng dẫn Frontend

> Bản đồng bộ với mobile: `green-lens-app/docs/BE-AI-Integration-Flow.md`  
> **Envelope:** `{ code, message, status, data }` — JSON camelCase trong `data`.

---

## Wizard FE (4 bước)

| Bước | Màn hình                                        | API                                              |
| ---- | ----------------------------------------------- | ------------------------------------------------ |
| 1    | Ảnh + **Dialog** AI                             | `POST /v1/reports/analyze`                       |
| 2    | Ô nhiễm — **auto-fill** `categoryId` + `nameVi` | (local) + `GET /v1/catalog/pollution-categories` |
| 3    | Map / địa chỉ                                   | Catalog tỉnh/phường                              |
| 4    | Submit                                          | `POST /v1/reports` + `tempImageId`               |

Ảnh chỉ lên CDN khi Submit thành công. Temp TTL **15 phút** (`expiresInSeconds: 900`).

---

## Analyze response (trích)

```json
{
  "tempImageId": "...",
  "expiresInSeconds": 900,
  "aiResult": {
    "decision": "ACCEPTABLE_REPORT_IMAGE",
    "classify": {
      "primaryClass": "TRASH",
      "confidence": 0.87,
      "severity": "HIGH"
    }
  },
  "suggestedCategory": {
    "id": "guid",
    "code": "TRASH",
    "nameVi": "Ô nhiễm rác thải",
    "nameEn": "Trash",
    "iconUrl": null
  }
}
```

**FE auto-fill bước 2** khi: decision acceptable/review + `suggestedCategory != null` + `confidence >= 0.70` (ngưỡng FE).

Map AI class → DB code: `Trash→TRASH`, `Water→WASTEWATER`, `Smoke→SMOKE`, `Chemical→CHEMICAL`.

---

## Submit (AI flow)

```json
{
  "categoryId": "<từ suggestedCategory.id hoặc user chọn>",
  "severity": "High",
  "latitude": 10.8195,
  "longitude": 106.6528,
  "isAnonymous": true,
  "tempImageId": "<từ analyze>",
  "images": null
}
```

Chi tiết đầy đủ, dialog, lỗi, luồng manual: xem **`green-lens-app/docs/BE-AI-Integration-Flow.md`**.

---

_2026-05-17_
