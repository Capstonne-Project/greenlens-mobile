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
| `ScenePhoto` | ≥ 2 ảnh | `POST /evidence?category=ScenePhoto` |
| `Video` | Không | `POST /evidence?category=Video` (≤30MB) |
| `Audio` | Không | `POST /evidence?category=Audio` (≤10MB) |
| `Other` | Không | `PUT /checklist` + optional file `Other` |

## API mới

| Method | Route | Role |
|--------|-------|------|
| POST | `/v1/inspections/{id}/accept` | Inspector member |
| POST | `/v1/inspections/{id}/confirm-arrival` | Inspector member |
| PUT | `/v1/inspections/{id}/checklist` | Inspector member |
| POST | `/v1/inspections/{id}/evidence` | Inspector member (multipart) |
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
