# Luồng: LEO bàn giao xử phạt cho Team Thanh tra → Hoàn thành xử phạt

> Module thực tế trong code tên là **Inspection** (không có module riêng tên "Penalty/Sanction/Handover").
> - **LEO** (Local Environmental Officer, role `LEO`) = người xác minh report và **bàn giao hồ sơ vi phạm** cho thanh tra.
> - **Inspector** (role `Inspector`, cụ thể là **Team Leader** của Inspection Team) = **Thanh tra** thực thi điều tra, ra quyết định xử phạt, ghi nhận nộp phạt.
> - Controller: `InspectionsController` (`src/Greenlens.Api/Controllers/InspectionsController.cs`) + 1 action tạo hồ sơ nằm ở `ReportsController`.
> - Prefix route: `/v1/inspections`, riêng action tạo hồ sơ: `/v1/reports/{id}/inspections`.
> - Response envelope chung: `{ code, message, status, data }`.

---

## 1. Entity & biến chính

### `InspectionReport` (`src/Greenlens.Domain/Entities/InspectionReport.cs`)

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `ReportId` | `Guid` | FK → Report gốc |
| `Status` | `InspectionStatus` | Trạng thái hồ sơ xử phạt (state machine chính) |
| `AssignedTeamId` | `Guid?` | FK → `EnvironmentalTeam` (team Thanh tra được gán) |
| `ViolationDescription` | `string?` | Mô tả vi phạm |
| `ViolatorName` / `ViolatorAddress` / `ViolatorIdentity` | `string?` | Thông tin đối tượng vi phạm |
| `ViolatingEntityId` | `Guid?` | FK → `ViolatingEntity` — dùng để check tái phạm chính xác (BR-INS-022) |
| `ViolationLevel` | `ViolationLevel?` | Mức độ vi phạm — set khi ra quyết định |
| `PenaltyAmount` | `decimal?` | Số tiền phạt |
| `PenaltyDecisionNumber` | `string?` | Số quyết định xử phạt |
| `PenaltyIssuedAt` / `PenaltyDueDate` | `DateTime?` | Ngày ra QĐ / hạn nộp phạt |
| `PaidAmount` | `decimal?` | Tổng đã nộp (cộng dồn qua các lần) |
| `AdditionalPenaltyMeasures` | `string?` | Biện pháp khắc phục bổ sung |
| `IsRepeatOffender` | `bool` | Cờ tái phạm (auto-check khi issue penalty) |
| `CreatedByOfficerId` | `Guid` | LEO tạo hồ sơ |
| `IssuedByInspectorId` | `Guid?` | Inspector Team Leader ra QĐ |
| `ClosedAt` / `ClosedReason` | `DateTime? / string?` | Thời điểm & lý do đóng hồ sơ |
| `SlaInspectionDueAt` | `DateTime?` | Hạn SLA điều tra (theo Severity của report) |
| `SlaInspectionBreached` | `bool` | Cờ đã vi phạm SLA |
| `AcceptedAt` / `AcceptedByUserId` | | Inspector nhận task lúc nào, ai nhận |
| `ArrivalConfirmedAt` / `ArrivalLatitude` / `ArrivalLongitude` / `ArrivalNote` | | Xác nhận có mặt hiện trường (BR-INS-033) |
| `FieldInvestigationSubmittedAt` / `FieldInvestigationSubmittedByUserId` | | Đã nộp biên bản điều tra (khóa checklist) |
| Navigation | | `Report`, `Evidences`, `CreatedByOfficer`, `IssuedByInspector`, `AssignedTeam`, `ViolatingEntity`, `Payments` |

### Enum `InspectionStatus` (`src/Greenlens.Domain/Enums/InspectionStatus.cs`)

```
Draft → InProgress → PenaltyIssued → (Paid | PartiallyPaid | Overdue) → Closed
                  └─────────────────► ClosedNoViolation
```

| Giá trị | Ý nghĩa |
|---|---|
| `Draft` | LEO vừa tạo/gán team, chờ Inspector nhận task |
| `InProgress` | Inspector đã nhận, đang điều tra hiện trường |
| `PenaltyIssued` | Đã ra quyết định xử phạt, chờ nộp phạt |
| `PartiallyPaid` | Đã nộp một phần |
| `Overdue` | Quá hạn nộp phạt (job hệ thống tự đánh dấu) |
| `Paid` | Đã nộp đủ, chờ đóng hồ sơ |
| `Closed` | Hồ sơ đã đóng (hoàn thành xử phạt) |
| `ClosedNoViolation` | Kết luận không có vi phạm — đóng hồ sơ |

### Enum liên quan khác

- **`ViolationLevel`**: `Minor, Moderate, Severe, Critical` (BR-INS-011)
- **`ViolatorType`**: `Individual, Business`
- **`InspectionEvidenceCategory`**: `ViolationStatus, ScenePhoto, Video, Audio, Other` (BR-INS-033)

### Entity phụ

- **`ViolatingEntity`**: `Name, Address?, TaxCode?(unique), IdentityNumber?(unique), PhoneNumber?, Type` — hồ sơ đối tượng vi phạm để trace tái phạm chuẩn xác.
- **`PenaltyPayment`**: `InspectionReportId, Amount, PaidAt, EvidenceUrl?, Note?, RecordedByUserId` — mỗi lần nộp phạt là 1 record, hỗ trợ nộp nhiều lần (partial).
- **`InspectionEvidence`**: `InspectionReportId, Category, MediaUrl?, MimeType?, SizeBytes?, Description?, DurationSeconds?, UploadedByUserId, UploadedAt`.

---

## 2. Luồng API theo thứ tự thực hiện

### Bước 0 — LEO xác minh report

```
PUT /v1/reports/{id}/verify
```
- Role: `LEO`, `Admin`
- Command: `VerifyReportCommand`
- Report: `Submitted → Verified`

---

### Bước 1 — LEO bàn giao hồ sơ xử phạt cho Thanh tra

**Cách A — tạo hồ sơ + gán team luôn:**

```
POST /v1/reports/{id}/inspections
```
- Role: `LEO`, `Admin`
- Command: `CreateInspectionReportCommand(Guid ReportId, Guid? AssignedTeamId, string? ViolationDescription, string? ViolatorName, string? ViolatorAddress, string? ViolatorIdentity)`
- Trả về: `Result<Guid>` (Id hồ sơ vừa tạo)
- BR: **BR-INS-001, BR-OFF-005, BR-ADM-010**
- Logic handler (`CreateInspectionReportCommandHandler`):
  1. Report phải `Status ∈ {Verified, InProgress}`, nếu không → lỗi `REPORT_NOT_VERIFIED`
  2. Không cho tạo trùng — nếu report đã có hồ sơ active → `INSPECTION_ALREADY_EXISTS` (409)
  3. Nếu có `AssignedTeamId` → team phải tồn tại và `TeamType == Inspection`
  4. Tạo `InspectionReport` với `Status = Draft`, tính `SlaInspectionDueAt` theo Severity (Critical +3d, High +5d, Medium +7d, Low +10d)
  5. Nếu gán team ngay và report đang `Verified` → **Report: `Verified → InProgress`**
  6. Ghi audit log, gửi notification cho team được gán

**Cách B — tạo Draft trước, gán team sau:**

```
PUT /v1/inspections/{id}/assign-team
```
- Role: `LEO`, `Admin`
- Command: `AssignInspectionTeamCommand(Guid InspectionId, Guid TeamId)`
- BR: BR-INS-001, BR-OFF-005
- Chỉ hợp lệ khi hồ sơ `Status ∈ {Draft, InProgress}`, ngược lại → `INSPECTION_INVALID_STATE`

---

### Bước 2 — Inspector Team nhận/từ chối task

**Nhận task:**
```
POST /v1/inspections/{id}/accept
```
- Role: `Inspector`
- Command: `AcceptInspectionTaskCommand(Guid InspectionId)`
- BR: BR-INS-033
- **`Draft → InProgress`**, set `AcceptedAt`, `AcceptedByUserId`
- Yêu cầu hồ sơ đã có `AssignedTeamId`, nếu chưa → `INSPECTION_NO_TEAM`

**Từ chối (trong 24h):**
```
POST /v1/inspections/{id}/decline
```
- Role: `Inspector`
- Command: `DeclineInspectionCommand(Guid InspectionId, string Reason)`
- BR: BR-INS-003 — chỉ được decline khi `Status == Draft` và trong 24h từ `CreatedAt`, quá hạn → `INSPECTION_DECLINE_EXPIRED`
- Effect: `AssignedTeamId = null` (status giữ `Draft`) để LEO gán team khác

---

### Bước 3 — Điều tra hiện trường (checklist, BR-INS-033)

1. **Xác nhận có mặt:**
   ```
   POST /v1/inspections/{id}/confirm-arrival
   ```
   - Command: `ConfirmArrivalCommand(Guid InspectionId, decimal Latitude, decimal Longitude, string? Note)`
   - GPS lệch ≤200m: OK; >200m: bắt buộc có `Note`. Chỉ hợp lệ khi `Status == InProgress`.

2. **Upload bằng chứng:**
   ```
   POST /v1/inspections/{id}/evidence   (multipart)
   ```
   - Command: `UploadInspectionEvidenceCommand(Guid InspectionId, InspectionEvidenceCategory Category, IReadOnlyList<InspectionEvidenceFile> Files, string? Description)`
     - `InspectionEvidenceFile(byte[] Bytes, string FileName, string ContentType, int? DurationSeconds)`
   - Response: `UploadInspectionEvidenceResponse(IReadOnlyList<string> UploadedUrls, int TotalCategoryCount)`
   - Category `ScenePhoto` cần ≥ 2 ảnh trước khi được nộp biên bản.

3. **Cập nhật checklist (text):**
   ```
   PUT /v1/inspections/{id}/checklist
   ```
   - Command: `UpdateInspectionChecklistCommand(Guid InspectionId, string ViolationStatusText, string? OtherDescription)`

4. **Cập nhật biên bản chi tiết:**
   ```
   PUT /v1/inspections/{id}/details
   ```
   - Command: `UpdateInspectionDetailsCommand(Guid InspectionId, string? ViolationDescription, string? ViolatorName, string? ViolatorAddress, string? ViolatorIdentity, Guid? ViolatingEntityId)`
   - BR-INS-010 — có thể liên kết `ViolatingEntity` để tracking tái phạm chính xác (BR-INS-022)

5. **Nộp biên bản điều tra (khóa checklist):**
   ```
   PUT /v1/inspections/{id}/submit-field-report
   ```
   - Role: `Inspector` (Team Leader)
   - Command: `SubmitFieldInvestigationCommand(Guid InspectionId)`
   - Validate: mô tả `ViolationStatus` không rỗng, và ≥2 evidence `ScenePhoto` có `MediaUrl`
   - Effect: set `FieldInvestigationSubmittedAt/By`. Status **không đổi** (vẫn `InProgress`) nhưng mở khóa bước ra kết luận.

---

### Bước 4 — Kết luận (2 nhánh)

**4a. Ra quyết định xử phạt (có vi phạm):**
```
PUT /v1/inspections/{id}/issue-penalty
```
- Role: `Inspector` **Team Leader**, `Admin`
- Command: `IssuePenaltyCommand(Guid InspectionId, ViolationLevel ViolationLevel, decimal PenaltyAmount, string DecisionNumber, int PaymentDueDays = 10, string? AdditionalMeasures)` — implements `IAuditable`
- BR: **BR-INS-011, BR-INS-012, BR-INS-022, BR-ADM-010**
- Logic (`IssuePenaltyCommandHandler`):
  1. Chỉ Team Leader của team được gán mới thực hiện (nếu không → `NOT_INSPECTION_TEAM_LEADER` / `NOT_ASSIGNED_TO_YOUR_TEAM`)
  2. Enforce đã có ≥2 scene photos (checklist mới hoặc fallback đếm `ReportMedia` legacy)
  3. **Check tái phạm (BR-INS-022):** nếu có `ViolatingEntityId` → đếm số hồ sơ trong 12 tháng gần nhất; nếu ≥1 → `IsRepeatOffender = true`. Fallback: match theo `ViolatorIdentity` (string).
  4. `PenaltyDueDate = UtcNow + PaymentDueDays`
  5. **`InProgress → PenaltyIssued`**; set `IssuedByInspectorId`, `ViolationLevel`, `PenaltyAmount`, `PenaltyDecisionNumber`, `PenaltyIssuedAt`, `PenaltyDueDate`, `AdditionalPenaltyMeasures`, `IsRepeatOffender`
  6. Raise domain event `PenaltyIssuedEvent` → gửi notification `NotificationType.PenaltyIssued` cho citizen đã báo cáo; notify LEO.
  - Điều kiện bắt buộc trong entity: `Status == InProgress` **và** `FieldInvestigationSubmittedAt.HasValue` (chưa nộp biên bản → `INSPECTION_FIELD_REPORT_REQUIRED`)

**4b. Kết luận không vi phạm (đường thay thế, kết thúc luồng):**
```
PUT /v1/inspections/{id}/close-no-violation
```
- Role: `Inspector`, `Admin`
- Command: `CloseNoViolationCommand(Guid InspectionId, string Reason)` — `Reason` ≥ 50 ký tự
- BR: BR-INS-013
- **`InProgress → ClosedNoViolation`**, set `ClosedAt`, `ClosedReason`. Notify LEO + citizen.

---

### Bước 5 — Ghi nhận nộp phạt (có thể nhiều lần / partial)

```
PUT /v1/inspections/{id}/record-payment   (multipart)
```
- Role: `Inspector` Team Leader, `Admin`
- Command: `RecordPaymentCommand(Guid InspectionId, decimal PaidAmount, DateTime PaidAt, string? EvidenceUrl, string? Note, byte[]? ReceiptBytes, string? ReceiptFileName, string? ReceiptContentType)`
- BR: **BR-INS-020**
- Logic (`RecordPaymentCommandHandler`):
  1. Chỉ Team Leader; ảnh biên lai bắt buộc (thiếu → `PaymentReceiptRequired`)
  2. Tạo `PenaltyPayment`; `inspection.RecordPayment(payment)`:
     - Chỉ hợp lệ khi `Status ∈ {PenaltyIssued, PartiallyPaid, Overdue}`
     - `PaidAmount += payment.Amount`
     - **`Status = (PaidAmount >= PenaltyAmount) ? Paid : PartiallyPaid`**

Xem lịch sử nộp phạt:
```
GET /v1/inspections/{id}/payments
```

Xóa (soft-delete) một khoản nộp — tính lại `PaidAmount` và re-derive status (`Paid` / `PartiallyPaid` / trả về `PenaltyIssued`/`Overdue` nếu `PaidAmount` về 0):
```
DELETE /v1/inspections/payments/{paymentId}
```
- Command: `DeletePenaltyPaymentCommand`

---

### Bước 6 — Đóng hồ sơ (hoàn thành xử phạt)

```
PUT /v1/inspections/{id}/close
```
- Role: `Inspector`, `Admin`
- Command: `CloseInspectionCommand(Guid InspectionId, string? Reason)`
- Chỉ hợp lệ khi `Status == Paid`
- **`Paid → Closed`**, set `ClosedAt`, `ClosedReason`

**→ Đây là điểm kết thúc luồng "hoàn thành xử phạt".**

---

## 3. Nhánh tự động (background jobs)

| Job | Lịch | BR | Hành vi |
|---|---|---|---|
| `SlaBreachInspectionJob` | mỗi 30' | BR-INS-030 | Tìm hồ sơ `Draft`/`InProgress` quá `SlaInspectionDueAt` → set `SlaInspectionBreached = true`, tự động **force-close** → `ClosedNoViolation` với lý do cố định (≥50 ký tự), notify LEO + reporter |
| `PenaltyPaymentOverdueJob` | mỗi giờ | BR-INS-021 | Tìm hồ sơ `PenaltyIssued`/`PartiallyPaid` quá `PenaltyDueDate` → **`→ Overdue`**, notify LEO/DEO |

(Có cả `MarkOverdueCommand` để trigger thủ công logic tương tự.)

---

## 4. Sơ đồ tổng hợp

```
Report:            Submitted → Verified ──(LEO tạo/gán inspection)──► InProgress → Resolved → Closed

InspectionReport:
  Draft ──AssignTeam──► Draft (có team)
  Draft ──AcceptTask (Inspector)──► InProgress
  Draft ──Decline (≤24h)──► Draft (ClearTeam, LEO gán lại)
  InProgress ──ConfirmArrival / UploadEvidence / UpdateChecklist / UpdateDetails──► InProgress
  InProgress ──SubmitFieldInvestigation──► InProgress (checklist khóa)
  InProgress ──IssuePenalty (cần field report)──► PenaltyIssued
  InProgress ──CloseNoViolation (cần field report, reason≥50)──► ClosedNoViolation
  Draft/InProgress ──[SLA breach, job]──► ClosedNoViolation (force)
  PenaltyIssued/PartiallyPaid/Overdue ──RecordPayment──► PartiallyPaid | Paid
  PenaltyIssued/PartiallyPaid ──[quá hạn, job]──► Overdue
  Paid ──Close──► Closed   ✅ HOÀN THÀNH XỬ PHẠT
```

## 5. Trình tự gọi API theo tác nhân

1. **LEO**: `PUT /v1/reports/{id}/verify`
2. **LEO**: `POST /v1/reports/{id}/inspections` *(bàn giao — tạo + gán team)* hoặc `PUT /v1/inspections/{id}/assign-team` *(gán sau)*
3. **Inspector**: `POST /v1/inspections/{id}/accept` hoặc `POST /v1/inspections/{id}/decline`
4. **Inspector**: `POST /v1/inspections/{id}/confirm-arrival` → `POST /v1/inspections/{id}/evidence` → `PUT /v1/inspections/{id}/checklist` → `PUT /v1/inspections/{id}/details`
5. **Inspector Team Leader**: `PUT /v1/inspections/{id}/submit-field-report`
6. **Inspector Team Leader**: `PUT /v1/inspections/{id}/issue-penalty` **hoặc** `PUT /v1/inspections/{id}/close-no-violation`
7. **Inspector Team Leader**: `PUT /v1/inspections/{id}/record-payment` *(gọi 1..n lần nếu nộp từng phần)*
8. **Inspector Team Leader**: `PUT /v1/inspections/{id}/close` *(khi status = Paid)* → **hoàn thành**
9. **System jobs** (song song, không do người gọi): `SlaBreachInspectionJob` (30'), `PenaltyPaymentOverdueJob` (1h)

---

## 6. Tài liệu liên quan

- Chi tiết request/response JSON đầy đủ cho từng endpoint: [`fe-inspection-api-guide.md`](./fe-inspection-api-guide.md)
- Business rules gốc: `SU26SE049_BusinessRules_v1_0.docx`, mapping tại `CLAUDE.md §5`
