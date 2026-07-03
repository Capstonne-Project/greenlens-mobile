# FE → BE: Danh sách tài liệu & API contract cần bổ sung

> **Mục đích:** Mobile app (`green-lens-app`) đã scaffold Citizen ✅, Field worker (Cleaner/CompanyStaff) ✅, Inspector shell ⚠️, CompanyManager shell ⚠️.  
> FE cần BE cung cấp **file `.md` hoặc Swagger export** có **request/response JSON mẫu** để map TypeScript types và QA E2E.  
> **Envelope chuẩn:** `{ code, message, status, data }` — prefix `/v1`.  
> **Tham chiếu:** [`MOBILE_APPS_MASTER_PLAN.md`](./MOBILE_APPS_MASTER_PLAN.md)

---

## Ưu tiên P0 — Block QA Inspector & CompanyManager

BE team tạo **2 file** (hoặc 1 file gộp 2 section) theo template cuối document.

### 1. `fe-inspection-api-guide.md`

Tag Swagger: **Inspection Dashboard** · Controller: `InspectionsController`

| # | Method | Path | FE màn hình |
|---|--------|------|-------------|
| 1 | GET | `/v1/inspections/queue` | Inspector tab Hồ sơ |
| 2 | GET | `/v1/inspections/{id}` | Chi tiết hồ sơ |
| 3 | PUT | `/v1/inspections/{id}/details` | Biên bản hiện trường (Draft) |
| 4 | PUT | `/v1/inspections/{id}/issue-penalty` | Ban hành QĐ phạt |
| 5 | PUT | `/v1/inspections/{id}/close-no-violation` | Không đủ căn cứ |
| 6 | PUT | `/v1/inspections/{id}/record-payment` | Ghi nhận nộp phạt |
| 7 | PUT | `/v1/inspections/{id}/close` | Đóng hồ sơ |
| 8 | GET | `/v1/reports/{reportId}/inspections` | Link read-only từ report |

**Mỗi endpoint cần ghi rõ:**

- Query params (vd. `status`, `page`, `pageSize`)
- Request body JSON (field name, type, required, validation)
- Response 200/204 — **full `data` object**
- Error codes 403/422 (vd. `NOT_TEAM_LEADER`, `INVALID_STATUS_TRANSITION`)

**Enum & field FE đang assume — BE xác nhận hoặc sửa:**

```ts
// InspectionStatus
'Draft' | 'PenaltyIssued' | 'Paid' | 'PartiallyPaid' | 'Overdue' | 'Closed' | 'ClosedNoViolation'

// InspectionDetail flags (tên field BE thật?)
canEditDetails, canIssuePenalty, canRecordPayment, canClose, canCloseNoViolation

// Ảnh: reportImages[] { url, mimeType? } — hay images / media?
// close-no-violation: reason min 50 chars?
```

**Ràng buộc nghiệp vụ (xác nhận):**

- Inspector **không** được gọi `PUT /v1/reports/{id}/resolve`
- Chỉ **team leader** Inspector mới PUT các action trên?

---

### 2. `fe-company-manager-api-guide.md`

Tag Swagger: **Company Dashboard** · Controllers: `CompaniesController`, `ReportsController` (company-*), `TeamsController` (company-teams)

| # | Method | Path | FE màn hình |
|---|--------|------|-------------|
| 1 | GET | `/v1/companies/my` | Tab Công ty |
| 2 | GET | `/v1/reports/company-queue` | Tab Chờ giao |
| 3 | POST | `/v1/reports/{reportId}/assign-company-team` | Modal phân công |
| 4 | GET | `/v1/reports/company-assignments` | Tab Đang chạy |
| 5 | GET | `/v1/reports/company-assignments/{reportId}` | Chi tiết tiến độ |
| 6 | GET | `/v1/teams/company-teams` | Tab Đội — list |
| 7 | POST | `/v1/teams/company-teams` | Tạo đội |
| 8 | PUT | `/v1/teams/company-teams/{id}` | Sửa đội |
| 9 | DELETE | `/v1/teams/company-teams/{id}` | Xóa đội |
| 10 | POST | `/v1/teams/company-teams/{id}/members` | Thêm thành viên |
| 11 | DELETE | `/v1/teams/company-teams/{id}/members/{userId}` | Xóa thành viên |
| 12 | GET | `/v1/companies/my/staff` | Tab Công ty — nhân sự |
| 13 | POST | `/v1/companies/my/staff` | Tạo staff |
| 14 | PUT | `/v1/companies/my/staff/{userId}/status` | Bật/tắt staff |

**Flow CM (xác nhận):**

```
LEO POST /reports/{id}/dispatch-to-company
  → CM GET  /reports/company-queue
  → CM POST /reports/{id}/assign-company-team
  → Staff GET /teams/my-tasks          (Field worker shell — dùng chung Cleaner)
  → CM GET  /reports/company-assignments
```

**Field FE đang assume — BE xác nhận:**

```ts
// assign-company-team body
{ teamId: string; note?: string }

// CompanyQueueItem
reportId, reportCode, categoryName, severity, address, reportStatus,
latitude, longitude, dispatchedAt, slaResolveDueAt?, firstImageUrl?

// CompanyAssignmentItem
+ assignmentId, assignmentStatus, teamId, teamName, progressPercent, ...

// Pagination: items, totalCount, page, pageSize — đúng không?
// Tạo staff body: { fullName, email, temporaryPassword } — hay flow khác?
```

---

## Ưu tiên P1 — Auth, role, Field worker (chốt v3)

### 3. `fe-auth-roles-mobile.md` (bổ sung [`MOBILE_AUTH_INTEGRATION.md`](./MOBILE_AUTH_INTEGRATION.md))

| Nội dung | Ví dụ cần |
|----------|-----------|
| `user.role` string từ login / refresh-token | `Cleaner`, `CompanyStaff`, `Inspector`, `CompanyManager`, `Citizen` |
| Legacy role còn trả không? | `CleanupTeam`, `Cleanup` |
| Field profile mobile | `teamId`, `teamName`, `companyId` có trong JWT/user object không? |
| Ma trận 403 | Role nào gọi được API nào (bảng ngắn) |

### 4. Cập nhật [`cleaner-progress-resolve-fe-guide.md`](./cleaner-progress-resolve-fe-guide.md)

Xác nhận cho **Cleaner + CompanyStaff** (cùng API):

| Method | Path | Cần xác nhận |
|--------|------|--------------|
| PUT | `/v1/reports/{reportId}/progress` | multipart: `progressPercent`, `progressNote`, `images[]` → `uploadedImageUrls[]` |
| PUT | `/v1/reports/{reportId}/resolve` | Body chỉ `{ afterImageUrls }` hay cần `teamId`? |
| POST | `/v1/reports/{reportId}/progress/images` | Endpoint riêng có tồn tại không? Response field `url` vs `imageUrl`? |
| GET | `/v1/teams/my-profile` | CM/Staff có gọi được không? (hiện FE không dùng khi resolve) |

---

## Ưu tiên P2 — Enum Report v3 & test accounts

### 5. `fe-report-status-v3.md` hoặc cập nhật `REPORT_LIFECYCLE.md`

- 7 giá trị `ReportStatus` chuẩn: `Submitted`, `Verified`, `InProgress`, `Resolved`, `Closed`, `Rejected`, `Duplicate`
- BE còn trả legacy trên Report không? (`Dispatched`, `Assigned`, `PenaltyIssued`, `ClosedNoViolation`)
- Citizen `PUT /reports/{id}/close`, `PUT /reports/{id}/reopen` — điều kiện + error codes

### 6. `SEED_ACCOUNTS.md`

| Role | Email | Password | Ghi chú |
|------|-------|----------|---------|
| Citizen | | | |
| Cleaner (team leader) | | | Có task Assigned |
| Cleaner (member) | | | |
| CompanyStaff (leader) | | | Task do CM assign |
| Inspector (leader) | | | Có item trong queue |
| CompanyManager | | | Có item company-queue |

Kèm **Base URL dev** (vd. `http://192.168.x.x:5162/v1`).

---

## P3 — Tùy chọn (polish)

| File | Khi nào cần |
|------|-------------|
| Cập nhật [`fe-citizen-map-viewport-summary.md`](./fe-citizen-map-viewport-summary.md) | BE đổi shape `GET /map/summary` |
| `GET /users/me` guide | Nếu BE có endpoint profile sync |

---

## Template copy-paste cho BE (mỗi endpoint)

````markdown
### GET /v1/inspections/queue

**Mô tả:** …  
**Auth:** Bearer · Role: Inspector (leader?)

**Query:**

| Param | Type | Required | Default |
|-------|------|----------|---------|
| status | string | no | |
| page | int | no | 1 |
| pageSize | int | no | 20 |

**Response 200:**

```json
{
  "code": "SUCCESS",
  "message": "OK",
  "status": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "reportId": "uuid",
        "reportCode": "RPT-2026-00001",
        "status": "Draft",
        "categoryName": "Rác thải",
        "severity": "High",
        "address": "...",
        "reportStatus": "Verified",
        "assignedAt": "2026-06-01T08:00:00Z"
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

**Errors:**

| HTTP | code | Ý nghĩa |
|------|------|---------|
| 403 | NOT_TEAM_LEADER | … |
| 422 | … | … |
````

---

## Checklist giao BE → FE

- [ ] `fe-inspection-api-guide.md` (8 endpoints, JSON mẫu)
- [ ] `fe-company-manager-api-guide.md` (14 endpoints, JSON mẫu)
- [ ] `fe-auth-roles-mobile.md` hoặc section trong auth doc (role strings + profile fields)
- [ ] Cập nhật `cleaner-progress-resolve-fe-guide.md` (progress + resolve chốt)
- [ ] `fe-report-status-v3.md` hoặc lifecycle doc cập nhật
- [ ] `SEED_ACCOUNTS.md` (6 role test + base URL)

**Sau khi nhận file:** FE sẽ cập nhật `src/types/*.types.ts`, `src/services/*.service.ts`, và QA từng shell — **không xóa UI Citizen/Cleaner hiện có**.

---

**Phiên bản:** 1.0 · 2026-06-01  
**Liên hệ FE:** team mobile GreenLens · repo `green-lens-app/docs/`
