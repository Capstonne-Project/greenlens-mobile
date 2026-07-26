# FE → BE: Request — Ảnh thumbnail báo cáo đã gộp (Duplicate merge)

> **Từ:** Mobile app (`green-lens-app`)  
> **Ngày:** 2026-07-26  
> **Ưu tiên:** P0 — block UX section “báo cáo đã gộp” trên chi tiết primary  
> **Liên quan:** BR-REP-031 / BR-REP-032 · [`fe-leo-duplicate-detection-guide.md`](./fe-leo-duplicate-detection-guide.md) §6 · [`fe-duplicate-merge-integration.md`](./fe-duplicate-merge-integration.md)

---
                                                                                                                                                                                                                                                  
## 1. Context (Mobile)

Citizen mở chi tiết **báo cáo gốc (primary)** sau khi báo cáo của họ bị LEO confirm-duplicate. UI cần hiện danh sách báo cáo đã gộp kèm **ảnh đại diện** từng report con (và card “Báo cáo của tôi” khi `status = Duplicate`).

Hiện tại sau merge, thumb report con thường **không còn** trên API detail → UI hiện placeholder trống dù lúc upload đã có ảnh.

---

## 2. Gap (đã đóng — BE 2026-07-26)

| Hành vi BE | Trước | Sau |
|------------|-------|-----|
| `confirm-duplicate` reassign media | Child `media` rỗng | Giữ reassign; thêm **projection** thumb |
| `GET /v1/reports/{id}` `mergedReports` | Không / thiếu `imageUrl` | Có `mergedReports[].imageUrl` |
| `GET /v1/reports/my` `imageUrl` | Duplicate hay thiếu | Luôn có thumb kể cả Duplicate |

**Không đổi** logic reassign media sang primary cho luồng xử lý/cleanup.

---

## 3. Yêu cầu

### P0-A — `GET /v1/reports/{id}` (primary)

Trả `mergedReports` (array) gồm các báo cáo đã gộp vào primary. Mỗi phần tử tối thiểu:

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| `id` | `Guid` | ❌ | ID báo cáo Duplicate |
| `code` | `string` | ✅ | Mã hiển thị (e.g. `RPT-2026-0048`) |
| `imageUrl` | `string` | ✅ | **Thumb** của báo cáo đó (URL CDN). Vẫn có sau reassign |
| `createdAt` | `datetime` | ✅ | Thời điểm tạo |
| `status` | `string` | ✅ | Thường `Duplicate` |

**Cách lấy `imageUrl` (BE chọn 1, ghi rõ trong response contract):**

1. **Snapshot / cache thumb** trên report Duplicate trước hoặc lúc reassign; hoặc  
2. Media đã nằm trên primary nhưng có meta `sourceReportId` → project URL đầu tiên theo `sourceReportId = mergedReport.id`.

### P0-B — `GET /v1/reports/my`

Với mọi item (đặc biệt `status = Duplicate`):

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| `imageUrl` | `string` | ✅ | Ảnh đại diện **vẫn trả** sau khi media đã reassign sang primary |

Giữ các field merge hiện có: `mergedIntoPrimaryReportId`, `mergedIntoPrimaryReportCode`.

### P1 (tuỳ chọn) — `GET /v1/reports/{duplicateId}`

Sau merge, vẫn trả ít nhất một trong hai:

- `imageUrl` (top-level), hoặc  
- `media[]` read-only snapshot (1+ item)

Không bắt buộc giữ ownership media trên child nếu đã có P0-A + P0-B.

---

## 4. Response mẫu mong muốn

### 4.1 Primary detail

```http
GET /v1/reports/{primaryId}
Authorization: Bearer {token}
```

```json
{
  "code": 200,
  "message": "OK",
  "status": "success",
  "data": {
    "id": "a1b2c3d4-0000-0000-0000-000000000001",
    "code": "RPT-2026-0045",
    "status": "InProgress",
    "reporterCount": 3,
    "media": [
      { "id": "...", "url": "https://cdn.example.com/primary-or-merged-1.jpg", "mediaType": "Before" }
    ],
    "mergedIntoPrimaryReportId": null,
    "mergedIntoPrimaryReportCode": null,
    "mergedReports": [
      {
        "id": "d1a2b3c4-0000-0000-0000-000000000048",
        "code": "RPT-2026-0048",
        "imageUrl": "https://cdn.example.com/img/thumb_child_48.jpg",
        "createdAt": "2026-07-22T14:30:00Z",
        "status": "Duplicate"
      },
      {
        "id": "e5f6g7h8-0000-0000-0000-000000000050",
        "code": "RPT-2026-0050",
        "imageUrl": "https://cdn.example.com/img/thumb_child_50.jpg",
        "createdAt": "2026-07-22T16:00:00Z",
        "status": "Duplicate"
      }
    ]
  }
}
```

### 4.2 My reports — item Duplicate

```http
GET /v1/reports/my?page=1&pageSize=20
Authorization: Bearer {token}
```

```json
{
  "data": {
    "items": [
      {
        "id": "d1a2b3c4-0000-0000-0000-000000000048",
        "code": "RPT-2026-0048",
        "categoryName": "Ô nhiễm rác thải",
        "severity": "Medium",
        "status": "Duplicate",
        "address": "125 Nguyễn Huệ, P. Bến Thành, Q.1",
        "createdAt": "2026-07-22T14:30:00Z",
        "resolvedAt": null,
        "closedAt": null,
        "imageUrl": "https://cdn.example.com/img/thumb_child_48.jpg",
        "mergedIntoPrimaryReportId": "a1b2c3d4-0000-0000-0000-000000000001",
        "mergedIntoPrimaryReportCode": "RPT-2026-0045"
      }
    ]
  }
}
```

---

## 5. Acceptance criteria

- [x] Sau LEO confirm-duplicate, `GET /v1/reports/{primaryId}.mergedReports[]` có phần tử cho mỗi report đã gộp, mỗi phần tử có `id` + `imageUrl` không null khi report đó từng có ảnh lúc submit. **(BE done 2026-07-26)**
- [x] `GET /v1/reports/my` với item `status=Duplicate` vẫn có `imageUrl` (cùng URL thumb hợp lệ). **(BE done)**
- [x] Reassign media sang primary **giữ nguyên** cho luồng xử lý / gallery primary (không regress).
- [x] Field name: `mergedReports` + `imageUrl` — FE đã consume.

---

## 6. Ghi chú FE (sau khi BE xong)

Mobile:

- Ưu tiên `detail.mergedReports[].imageUrl` làm seed section “báo cáo đã gộp”.
- Không GET `/reports/{childId}` khi seed đã có `code` + `imageUrl` (tránh media rỗng sau reassign).
- Giữ fallback `fromMergedReportImageUrl` từ list my-reports khi navigate từ tab (phòng payload thiếu 1 row).
- `MyReportItem.imageUrl` dùng trực tiếp trên list card / profile grid.
