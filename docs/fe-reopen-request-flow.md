# Yêu cầu mở lại báo cáo (BR-REP-015) — contract hiện hành

> **Doc này thay thế phần "Reopen" trong các handoff cũ.**
> `fe-citizen-map-report-detail.md`, `fe-citizen-reports-tab-detail.md`,
> `mobile-citizen-and-cleanup-handoff.md` đều mô tả `PUT /reopen` với giới hạn 2 lần —
> **đã lỗi thời**, đừng dùng.

## Thay đổi so với contract cũ

| | Cũ (docs cũ) | Hiện tại |
|---|---|---|
| Endpoint | `PUT /v1/reports/{id}/reopen` | `POST /v1/reports/{id}/reopen-requests` |
| Body | không có | `reason` + `imageUrls` (+ `videoUrl`) |
| Hiệu lực | đổi status ngay `Resolved → InProgress` | tạo **yêu cầu**, giữ `Resolved` tới khi LEO duyệt |
| Số lần | 2 | **1** (`Report.MaxApprovedReopens = 1`) |

`PUT /reopen` vẫn tồn tại nhưng luôn trả `REOPEN_USE_REQUEST_ENDPOINT` — chỉ là redirect nhắc dùng API mới.

## Endpoint

```http
POST /v1/reports/{id}/reopen-requests
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "string",       // bắt buộc, 20–2000 ký tự
  "imageUrls": ["string"],  // bắt buộc, 1–5 publicUrl
  "videoUrl": "string"      // optional
}
```

**Response:** `ApiResponse<Guid>` — `data` là `reopenRequestId`.

## `imageUrls` phải là URL của storage hệ thống

BE validate `IsOwnedPublicUrl(url)` → gửi URL ngoài sẽ nhận `INVALID_STORAGE_URL`.
Phải upload qua presign trước:

1. `POST /v1/media/presign` — `purpose: "ReopenEvidence"`, kèm `reportId`
2. `PUT` file lên `uploadUrl` trả về
3. Gửi `publicUrl` trong `imageUrls`

Presign với `ReopenEvidence` chạy **cùng bộ eligibility** như submit — nếu không đủ điều kiện thì fail ngay từ bước 1.

Code FE: [`useReopenEvidence`](../src/hooks/useReopenEvidence.ts) → `pollutionReportService.uploadImage({ purpose: 'ReopenEvidence', reportId })`.

## Điều kiện được gửi yêu cầu

Tất cả phải đúng (`ReopenRequestEligibility.ValidateCitizenCanRequest`):

- `reporterId === currentUser.id` — chỉ người gửi báo cáo
- `status === 'Resolved'`
- Trong vòng **7 ngày** kể từ `resolvedAt`
- `hasPendingReopenRequest === false`
- `reopenedCount < 1`

FE ẩn nút khi không thỏa — xem [`getReportFooterActions`](../src/utils/report-status.ts).

## Field liên quan trong `GET /reports/{id}`

| Field | Dùng để |
|---|---|
| `reopenedCount` | Ẩn nút khi `>= 1` |
| `hasPendingReopenRequest` | Ẩn nút + hiện "đang chờ cán bộ xem xét" |
| `pendingReopenRequest` | `{ requestId, reason, requestedAt, evidenceMedia }` |
| `resolvedAt` | Tính cửa sổ 7 ngày |

## Error codes

| Code | HTTP | Khi nào |
|---|---|---|
| `REOPEN_LIMIT_REACHED` | 422 | Đã dùng hết 1 lần mở lại |
| `REOPEN_WINDOW_EXPIRED` | 422 | Quá 7 ngày từ `resolvedAt` |
| `PENDING_REOPEN_REQUEST_EXISTS` | 409 | Đã có yêu cầu đang chờ duyệt |
| `REOPEN_EVIDENCE_REQUIRED` | 422 | Không có ảnh minh chứng |
| `CANNOT_REOPEN_FROM_CLOSED` | 422 | Báo cáo đã `Closed` |
| `CANNOT_REOPEN_NOT_RESOLVED` | 422 | Status khác `Resolved` |
| `NOT_REPORT_OWNER` | 403 | Không phải người gửi |
| `INVALID_STORAGE_URL` | 422 | URL ảnh không thuộc storage hệ thống |

## Sau khi gửi

Báo cáo **giữ nguyên `Resolved`** — không đổi status.
LEO duyệt (`POST .../reopen-requests/{requestId}/approve`) → `Resolved → Reopened`.
LEO từ chối (`.../reject`, lý do ≥ 20 ký tự) → vẫn `Resolved`.

Copy UI phải nói "gửi yêu cầu để cán bộ xem xét", không nói "báo cáo sẽ được xử lý lại ngay".

## Files FE

| File | Vai trò |
|---|---|
| [`ReopenRequestModal.tsx`](../src/components/report/ReopenRequestModal.tsx) | Form lý do + ảnh |
| [`useReopenEvidence.ts`](../src/hooks/useReopenEvidence.ts) | Pick + nén + upload presign |
| [`useReportDetail.ts`](../src/hooks/useReportDetail.ts) | `requestReopen(dto)` |
| [`reportDetail.service.ts`](../src/services/reportDetail.service.ts) | `requestReopen` |
| [`report-status.ts`](../src/utils/report-status.ts) | Điều kiện hiện nút |
