# FE Guide — Inspection Checklist Workflow (BR-INS-033)

> **Audience:** Inspector Mobile App  
> **Thay thế:** `POST /check-in`, `PUT /progress` → **410 Gone**  
> **Ghi chú:** Guide này không thay đổi trong batch DEO/recurrence monitoring. API inspection list/detail giữ nguyên query params hiện có.

## Luồng mới

```
Draft → POST /accept → InProgress
      → POST /confirm-arrival (optional, GPS mềm)
      → PUT /checklist + POST /evidence
      → PUT /submit-field-report (Team Leader)
      → PUT /issue-penalty | PUT /close-no-violation
      → PUT /record-payment (multipart + biên lai)
      → PUT /close (manual sau Paid)
```

## Checklist cố định

| Category | Bắt buộc | Upload route |
|----------|----------|--------------|
| `ViolationStatus` | Text | `PUT /checklist` |
| `ScenePhoto` | ≥ 2 ảnh | `POST /evidence` — `category: "ScenePhoto"` (≤20MB/ảnh) |
| `Video` | Không | `POST /evidence` — `category: "Video"` (≤30MB) |
| `Audio` | Không | `POST /evidence` — `category: "Audio"` (≤10MB) |
| `Other` | Không | `PUT /checklist` + optional file `Other` (≤20MB) |

## Upload evidence — JSON, không còn multipart

BE đã đổi `POST /evidence` sang `application/json`. File phải upload thẳng lên R2 trước:

```
1) POST /v1/media/presign
   { fileName, contentType, purpose: "InspectionEvidence",
     inspectionId, evidenceCategory, fileSizeBytes }
2) PUT <uploadUrl>  (binary, kèm requiredHeaders)
3) POST /v1/inspections/{id}/evidence
   { category, items: [{ url, contentType, sizeBytes, durationSeconds? }], description? }
```

Ràng buộc BE:

- Tối đa **5 item** mỗi request.
- `url` phải nằm trong folder `reports/{reportId}/inspection/{inspectionId}/{category}` — nên **bắt buộc** presign kèm `inspectionId` + `evidenceCategory`, không dùng presign chung.
- `durationSeconds` nếu gửi phải **> 0** (bỏ field khi bản ghi < 1s).
- Chỉ role `Inspector` được presign `purpose=InspectionEvidence`; inspection phải đang `InProgress` và chưa `submit-field-report`.
- Response: `{ uploadedUrls, totalCategoryCount }`.

## API mới

| Method | Route | Role |
|--------|-------|------|
| POST | `/v1/inspections/{id}/accept` | Inspector member |
| POST | `/v1/inspections/{id}/confirm-arrival` | Inspector member |
| PUT | `/v1/inspections/{id}/checklist` | Inspector member |
| POST | `/v1/media/presign` | Inspector (purpose=InspectionEvidence) |
| POST | `/v1/inspections/{id}/evidence` | Inspector member (**JSON**, xem mục dưới) |
| PUT | `/v1/inspections/{id}/submit-field-report` | Team Leader |

## GET detail capability flags

`GET /v1/inspections/{id}` trả thêm checklist evidence + flags:

- `canAcceptTask`, `canConfirmArrival`, `canEditChecklist`, `canSubmitFieldReport`
- `canIssuePenalty`, `canCloseNoViolation` (chỉ sau submit field report)

## GPS mềm (confirm-arrival)

- ≤ 200m: OK, note optional
- \> 200m: **bắt buộc** `note` giải trình

## Record payment

`PUT /record-payment` — **multipart/form-data**:

- `paidAmount`, `paidAt`, `receipt` (file, required), `note` (optional)

## Deprecated (410)

- `POST /check-in`
- `PUT /progress`

Không dùng progress bar / % tiến độ trên UI Inspector.
