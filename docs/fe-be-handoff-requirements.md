# FE → BE: Tài liệu cần để hoàn thiện Mobile

> **Mục đích:** Mobile đã scaffold Citizen ✅, Cleaner/Field worker ✅, Inspector shell, CompanyManager shell.  
> FE cần BE cung cấp **contract JSON thật** (request/response + error codes) để map types, QA E2E.  
> **Envelope chuẩn:** `{ code, message, status, data }` — prefix `/v1`.  
> **Tham chiếu:** [`MOBILE_APPS_MASTER_PLAN.md`](./MOBILE_APPS_MASTER_PLAN.md), [`MOBILE_AUTH_INTEGRATION.md`](./MOBILE_AUTH_INTEGRATION.md)

---

## Ưu tiên P0 — Block QA Inspector & CompanyManager

### 1. `fe-inspection-api-guide.md`

Swagger tag: **Inspection Dashboard** / `InspectionsController`

| # | Method | Path | FE đang gọi |
|---|--------|------|-------------|
| 1 | GET | `/v1/inspections/queue` | ✅ `inspection.service.ts` |
| 2 | GET | `/v1/inspections/{id}` | ✅ |
| 3 | PUT | `/v1/inspections/{id}/details` | ✅ |
| 4 | PUT | `/v1/inspections/{id}/issue-penalty` | ✅ |
| 5 | PUT | `/v1/inspections/{id}/close-no-violation` | ✅ |
| 6 | PUT | `/v1/inspections/{id}/record-payment` | ✅ |
| 7 | PUT | `/v1/inspections/{id}/close` | ✅ |
| 8 | GET | `/v1/reports/{reportId}/inspections` | ✅ (read-only link) |

**Mỗi endpoint cần trong file:**

- Query params / request body (JSON mẫu)
- Response 200/204 + `data` shape đầy đủ
- Enum **`InspectionStatus`** chính xác
- Flags trên detail: `canEditDetails`, `canIssuePenalty`, `canRecordPayment`, `canClose`, `canCloseNoViolation` — **tên field BE thật**
- Validation: `close-no-violation.reason` ≥ 50 ký tự; kiểu `penaltyAmount` / `paidAmount`
- **Error codes** (403/422): ví dụ `NOT_TEAM_LEADER`, `INVALID_STATUS_TRANSITION`
- Ảnh: field name (`reportImages` / `images` / `media`?) + item shape `{ url, mimeType? }`

**FE types hiện tại (cần BE confirm):** `src/types/inspection.types.ts`

---

### 2. `fe-company-manager-api-guide.md`

Swagger tag: **Company Dashboard** / `CompaniesController`, `ReportsController` (company-*)

| # | Method | Path | FE đang gọi |
|---|--------|------|-------------|
| 1 | GET | `/v1/companies/my` | ✅ |
| 2 | GET | `/v1/reports/company-queue` | ✅ |
| 3 | POST | `/v1/reports/{id}/assign-company-team` | ✅ |
| 4 | GET | `/v1/reports/company-assignments` | ✅ |
| 5 | GET | `/v1/reports/company-assignments/{reportId}` | ✅ |
| 6 | GET | `/v1/teams/company-teams` | ✅ |
| 7 | POST | `/v1/teams/company-teams` | ✅ |
| 8 | PUT | `/v1/teams/company-teams/{id}` | ✅ (chưa có UI) |
| 9 | DELETE | `/v1/teams/company-teams/{id}` | ✅ (chưa có UI) |
| 10 | POST | `/v1/teams/company-teams/{id}/members` | ✅ (chưa có UI) |
| 11 | DELETE | `/v1/teams/company-teams/{id}/members/{userId}` | ✅ (chưa có UI) |
| 12 | GET | `/v1/companies/my/staff` | ✅ |
| 13 | POST | `/v1/companies/my/staff` | ✅ (chưa có UI tạo staff) |
| 14 | PUT | `/v1/companies/my/staff/{userId}/status` | ✅ (chưa có UI) |

**Mỗi endpoint cần:**

- Body `assign-company-team`: `{ teamId, note? }` — confirm
- Queue item vs assignment item: field names (`reportId`, `reportCode`, `dispatchedAt`, `progressPercent`, …)
- Pagination: `page`, `pageSize`, `totalCount` vs tên khác
- Tạo staff: body thật (`temporaryPassword` / invite link / OTP?)
- Team member add/remove body

**FE types hiện tại:** `src/types/company-manager.types.ts`  
**FE service:** `src/services/companyManager.service.ts`

---

### 3. `SEED_ACCOUNTS.md`

Tài khoản test trên môi trường dev (email + password):

| Role | Email | Password | Ghi chú |
|------|-------|----------|---------|
| Citizen | | | |
| Cleaner (team leader) | | | Có task Assigned/InProgress |
| Cleaner (member) | | | |
| CompanyStaff (leader) | | | Task do CM assign |
| Inspector (leader) | | | Có item trong queue |
| CompanyManager | | | Có item company-queue |

---

## Ưu tiên P1 — Chốt Auth & Field worker (Cleaner + CompanyStaff)

### 4. Bổ sung auth / roles (có thể section trong `MOBILE_AUTH_INTEGRATION.md`)

- **`data.user.role` string chính xác** từ login + refresh-token  
  (`Cleaner`, `CompanyStaff`, `Inspector`, `CompanyManager`, legacy `CleanupTeam`?)
- JWT/profile có **`teamId`, `teamName`, `companyId`** không?
- Matrix ngắn: role nào → API nào được phép / 403

**FE mapping:** `src/utils/mobile-user.ts`, `src/shared/role-router.ts`

---

### 5. Cập nhật `cleaner-progress-resolve-fe-guide.md` (Field worker v3)

Xác nhận cho **Cleaner + CompanyStaff** (cùng API):

| Method | Path |
|--------|------|
| GET | `/v1/teams/my-tasks`, `/v1/teams/my-tasks/{reportId}` |
| PUT | `/v1/teams/my-tasks/{reportId}/accept`, `/decline` |
| PUT | `/v1/reports/{reportId}/progress` (multipart) |
| PUT | `/v1/reports/{reportId}/resolve` |

**Cần confirm:**

- `PUT /progress` response: `{ uploadedImageUrls: string[] }` — field name & khi nào rỗng
- `PUT /resolve` body: chỉ `{ afterImageUrls }` hay cần `teamId`?
- `POST /v1/reports/{id}/progress/images` có tồn tại không? (path upload riêng)
- `GET /v1/teams/my-profile` — khi nào cần, response shape
- Error codes: `INSUFFICIENT_AFTER_IMAGES`, `NOT_TEAM_LEADER`, `INVALID_STATUS_TRANSITION`

**FE hiện tại:** upload after qua `PUT /progress` rồi `PUT /resolve` — `src/services/cleanupAssignment.service.ts`

---

## Ưu tiên P2 — Citizen v3 & enum thống nhất

### 6. `REPORT_LIFECYCLE.md` hoặc `fe-report-status-v3.md`

- 7 giá trị **`ReportStatus`**: `Submitted`, `Verified`, `InProgress`, `Resolved`, `Closed`, `Rejected`, `Duplicate`
- BE còn trả legacy trên Report không? (`Dispatched`, `Assigned`, `PenaltyIssued`, `ClosedNoViolation`)
- Citizen `PUT /reports/{id}/close`, `PUT /reports/{id}/reopen` — điều kiện + error codes

**FE types:** `src/types/report-status.types.ts`

---

## Template BE copy-paste (mỗi endpoint)

```markdown
### GET /v1/inspections/queue

**Auth:** Bearer, role Inspector (leader?)

**Query:**
| Param | Type | Required | Default |
|-------|------|----------|---------|
| status | string | no | |
| page | int | no | 1 |
| pageSize | int | no | 20 |

**Response 200:**
\`\`\`json
{
  "code": "SUCCESS",
  "status": 200,
  "message": "...",
  "data": {
    "items": [ { "id": "...", "reportId": "...", "status": "Draft" } ],
    "totalCount": 0,
    "page": 1,
    "pageSize": 20
  }
}
\`\`\`

**Errors:**
| HTTP | code | Ý nghĩa |
|------|------|---------|
| 403 | NOT_TEAM_LEADER | ... |
```

---

## Checklist giao nhận

- [ ] `fe-inspection-api-guide.md` — đủ 8 endpoint + enums + errors
- [ ] `fe-company-manager-api-guide.md` — đủ 14 endpoint + errors
- [ ] `SEED_ACCOUNTS.md` — 6 role test
- [ ] Auth roles + JWT claims (P1)
- [ ] Field worker progress/resolve confirm (P1)
- [ ] ReportStatus v3 / lifecycle (P2)

---

## Trạng thái FE (khi nhận doc)

| Module | Code | Cần BE doc |
|--------|------|------------|
| Citizen | ✅ Giữ nguyên UI | P2 lifecycle (optional) |
| Cleaner / CompanyStaff | ✅ Giữ nguyên UI | P1 progress/resolve |
| Inspector | Shell + service | **P0 inspection guide** |
| CompanyManager | Shell + service | **P0 company guide** |

**Sau khi có doc:** FE sẽ cập nhật `src/types/*.types.ts`, test E2E từng role, bổ sung UI CRUD còn thiếu (CM team/staff) nếu BE confirm contract.

---

_Phiên bản: 2026-06-01 · Liên hệ: team mobile GreenLens_
