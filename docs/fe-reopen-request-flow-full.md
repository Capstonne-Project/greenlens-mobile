# Luồng "Mở lại báo cáo" — tổng hợp đầy đủ (list + detail)

> Bổ sung cho [`fe-reopen-request-workflow-guide.md`](./fe-reopen-request-workflow-guide.md)
> (contract API gốc từ BE) — file này mô tả **UI hiện tại** ở cả màn "Báo cáo của tôi" và
> chi tiết báo cáo, qua từng bước của luồng.

## Có cần chạy migration / update gì không?

**Không.** Cột `has_pending_reopen_request` và `reopened_count` đã tồn tại trong DB từ
migration `202607271930_AddReportReopenRequest` — chạy từ trước. Thay đổi mới nhất chỉ là
BE đọc thêm 2 cột **đã có sẵn** vào response `GET /reports/my` (trước đó chỉ
`GET /reports/{id}` trả field này). Không đổi schema.

Cần làm: **build lại BE và restart service** để code mới có hiệu lực. Không cần
`dotnet ef database update`.

---

## Toàn cảnh state machine

```
Submitted → Verified → InProgress → Resolved → Closed
                              ↑            │
                              │            ├─ citizen gửi yêu cầu → vẫn Resolved
                              │            │   + hasPendingReopenRequest = true
                              │            │
                              │            ├─ LEO duyệt → Reopened
                              │            │   (hasPendingReopenRequest = false,
                              │            │    reopenedCount++, resolvedAt = null)
                              │            │
                              │            └─ LEO từ chối → vẫn Resolved
                              │                (hasPendingReopenRequest = false)
                              │
                              └── LEO assign lại team → InProgress (từ Reopened)
```

Report **không** có status riêng cho "đang chờ duyệt" — vẫn là `Resolved`, chỉ khác ở cờ
`hasPendingReopenRequest`. Đây là điểm dễ làm FE hiển thị sai nếu không đọc thêm cờ này.

---

## 5 trạng thái hiển thị cho citizen (không phải 5 status BE)

| # | Điều kiện (status + cờ) | Người dùng thấy gì | Hành động khả dụng |
|---|---|---|---|
| 1 | `Resolved`, chưa gửi yêu cầu | "Cần xác nhận" | Đóng báo cáo / Mở lại (nếu còn lượt + trong 7 ngày) |
| 2 | `Resolved` + `hasPendingReopenRequest=true` | "Chờ duyệt mở lại" | Không có — chỉ chờ LEO |
| 3 | `Reopened` | "Đã mở lại — chờ xử lý" | Không có — chờ LEO phân công team |
| 4 | `Resolved`, hết lượt (`reopenedCount>=1`) hoặc quá 7 ngày | "Cần xác nhận" (không có nút Mở lại) | Chỉ Đóng báo cáo |
| 5 | LEO từ chối → về lại `Resolved`, `hasPendingReopenRequest=false` | Giống trạng thái #1 hoặc #4 tuỳ lượt còn lại | Tuỳ điều kiện |

---

## Luồng theo mốc thời gian

### Mốc 0 — Báo cáo vừa Resolved

**List "Báo cáo của tôi"** ([MyReportListCard.tsx](../src/components/report/MyReportListCard.tsx))
- Badge: **"Cần xác nhận"** (cam, `#9A3412` / nền `#FFEDD5`)
- Dòng timeline: "Đã hoàn thành — chờ bạn xác nhận"
- Chân card: "Xác nhận kết quả →"

**Detail** ([ReportDetailView.tsx](../src/components/report/ReportDetailView.tsx))
- Footer: 2 nút **Đóng báo cáo** / **Mở lại** (nếu `reopenedCount < 1` và trong 7 ngày)
- Bấm "Mở lại" → mở [ReopenRequestModal.tsx](../src/components/report/ReopenRequestModal.tsx)
  (form lý do ≥20 ký tự + 1–5 ảnh)

### Mốc 1 — Vừa gửi yêu cầu mở lại (`POST /reports/{id}/reopen-requests`)

Status **vẫn `Resolved`** — chỉ `hasPendingReopenRequest` chuyển `true`.

**List** — sau khi refetch:
- Badge đổi thành **"Chờ duyệt mở lại"** (cam đậm `#7C2D12` / nền `#FFEDD5`) —
  [PENDING_REOPEN_META](../src/components/report/MyReportListCard.tsx)
- Dòng timeline: "Yêu cầu mở lại đã gửi — đang chờ cán bộ xem xét"
- Chân card: **ẩn** — không có gì cần bạn làm lúc này
- Nằm trong tab lọc **"Đang xử lý"**, không còn ở "Cần xác nhận"
  ([filterMyReportsByKey](../src/types/my-reports.types.ts))

**Detail**:
- Footer: 2 nút biến mất, thay bằng thông báo
  **"Yêu cầu mở lại đang chờ cán bộ xem xét"**
  ([getReportFooterActions](../src/utils/report-status.ts))
- Phần thân hiện `pendingReopenRequest` (lý do + ảnh đã gửi) nếu UI đó đã build sẵn

### Mốc 2a — LEO duyệt (`POST .../approve`)

Status chuyển **`Resolved → Reopened`**. `reopenedCount++`, `resolvedAt` bị xoá (chu kỳ mới),
`hasPendingReopenRequest = false`.

**List**:
- Badge: **"Đã mở lại — chờ xử lý"** (xanh dương `#0369A1` / nền `#E0F2FE`, `highlight: true`)
- Dòng timeline: "Yêu cầu mở lại đã được chấp nhận — đang xử lý lại"
- Nằm trong tab **"Đang xử lý"**

**Detail**:
- Timeline 4 mốc (Gửi → Xác minh → Xử lý → Hoàn thành):
  mốc **Xác minh** và **Xử lý** vẫn hiện *đã xong* (không lùi về vạch xuất phát dù
  `resolvedAt` đã bị xoá), mốc **Hoàn thành** hiện label riêng **"Đang xử lý lại"**
  thay vì "Chưa hoàn thành" chung chung
  ([getCitizenProgress](../src/utils/report-status.ts))
- Footer: thông báo **"Yêu cầu mở lại đã được chấp nhận — đang chờ phân công đội xử lý"**

### Mốc 2b — LEO từ chối (`POST .../reject`)

Status **giữ nguyên `Resolved`**, `hasPendingReopenRequest = false`.

- List/detail quay về đúng Mốc 0 — badge "Cần xác nhận" trở lại
- Nếu đã dùng hết lượt reopen từ trước đó, nút "Mở lại" sẽ **không** hiện lại (vì
  `reopenedCount` không tăng khi bị từ chối — vẫn còn lượt để thử lại)
- Notification `ReopenRequestDecided` kèm lý do từ chối (hiển thị notification, không phải
  trên card)

### Mốc 3 — LEO phân công lại team → `InProgress`

Giống hệt luồng `Verified → InProgress` thông thường — không có xử lý riêng cho việc
"đã từng reopen".

---

## Bảng đối chiếu nhanh: field BE ↔ UI

| Field (`GET /reports/my` + `GET /reports/{id}`) | Dùng ở đâu |
|---|---|
| `status` | Badge cơ bản, nhánh chính trong `timelineCopy` |
| `hasPendingReopenRequest` | Ghi đè badge/timeline khi `status=Resolved` — phân biệt Mốc 0 vs Mốc 1 |
| `reopenedCount` | Ẩn nút "Mở lại" khi `>= 1`; hiện "Đã mở lại {n}/1 lần" trong detail |
| `pendingReopenRequest` | *(chỉ ở detail)* — lý do + ảnh minh chứng đã gửi, LEO/citizen xem lại |
| `resolvedAt` | Tính cửa sổ 7 ngày còn được yêu cầu mở lại; bị xoá khi approve |

---

## Files liên quan

**BE**
- [`GetMyReportsQuery.cs`](../../../Server/greenlens-service/src/Greenlens.Application/Features/Reports/GetMyReports/GetMyReportsQuery.cs) — record `MyReportItem` (đã thêm `HasPendingReopenRequest`, `ReopenedCount`)
- [`GetMyReportsQueryHandler.cs`](../../../Server/greenlens-service/src/Greenlens.Application/Features/Reports/GetMyReports/GetMyReportsQueryHandler.cs)

**FE**
- [`my-reports.types.ts`](../src/types/my-reports.types.ts) — type + filter theo tab
- [`MyReportListCard.tsx`](../src/components/report/MyReportListCard.tsx) — card trong list
- [`report-status.ts`](../src/utils/report-status.ts) — `STATUS_META`, `getCitizenProgress`, `getReportFooterActions`
- [`ReportDetailView.tsx`](../src/components/report/ReportDetailView.tsx) — modal gửi yêu cầu, footer detail
- [`ReopenRequestModal.tsx`](../src/components/report/ReopenRequestModal.tsx) — form lý do + ảnh
- [`useReopenEvidence.ts`](../src/hooks/useReopenEvidence.ts) — upload ảnh minh chứng

## Chưa kiểm chứng trên thiết bị thật

Toàn bộ nội dung trên là soát code + build sạch (typecheck/lint FE, `dotnet build` BE) —
**chưa chạy end-to-end qua app thật**. Cần test tối thiểu:

1. Resolved → gửi yêu cầu → xem list ngay lúc đó (Mốc 1)
2. LEO duyệt (cần tài khoản LEO) → xem lại list + detail (Mốc 2a)
3. LEO từ chối → xem lại list + detail (Mốc 2b)
