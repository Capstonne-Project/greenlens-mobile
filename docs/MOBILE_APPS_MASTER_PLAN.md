# GreenLens Mobile — Master plan (Citizen · Field worker · Inspector · Công ty)

> **Đối tượng:** Team mobile (React Native / Flutter).  
> **Backend chuẩn:** model **v3.0** — LEO xác minh trực tiếp, `Report` 7 status, xử phạt qua **`InspectionReport`** (sub-process riêng).  
> **Base URL:** xem [`00_API_CONVENTIONS.md`](../00_API_CONVENTIONS.md) và [`MOBILE_AUTH_INTEGRATION.md`](./MOBILE_AUTH_INTEGRATION.md).

**Lưu ý doc cũ:** `fe-team-workflow-guide.md`, `report_workflow_v2_NEW.md` còn nhắc `Dispatched`, `PenaltyIssued` trên `Report`, role `Cleanup` — **không dùng**. Chuẩn: **Swagger** + `src/Greenlens.Domain/Entities/Report.cs`.

---

## 0. Hiện trạng app (baseline)

| Module | Trạng thái | Ghi chú |
|--------|------------|---------|
| **Citizen** | ✅ Xong | Map, submit, tab báo cáo |
| **Cleanup (Cleaner)** | ✅ Xong | `my-tasks`, progress, resolve |
| **Inspector** | ❌ Chưa | Luồng `/v1/inspections/*` |
| **Công ty (CM + Staff)** | ❌ Chưa | CM queue + assign; Staff dùng chung API field worker |

---

## 1. Kiến trúc — 1 app, nhiều shell theo `role`

Sau `POST /auth/login`, đọc `data.user.role` → redirect **một lần**, không trộn tab Citizen với Officer/Team.

```
login → RoleRouter
  ├─ Citizen          → CitizenShell
  ├─ Cleaner          → FieldWorkerShell  ─┐
  ├─ CompanyStaff     → FieldWorkerShell  ─┴─ CÙNG màn hình (API giống hệt)
  ├─ Inspector        → InspectorShell
  ├─ CompanyManager   → CompanyManagerShell
  ├─ LEO / DEO        → Web admin (mobile optional, phase sau)
  └─ Admin            → Không mobile
```

### Refactor đề xuất

| Hiện tại (có thể) | Chuẩn hóa |
|-------------------|-----------|
| Module “Cleanup” hard-code | **`FieldWorkerModule`** — `role: Cleaner \| CompanyStaff` |
| Resolve cho mọi team type | Chỉ **Cleaner + CompanyStaff**; Inspector **không** `PUT /reports/{id}/resolve` |
| UI status `PenaltyIssued` trên Report | **Bỏ** — xử phạt = `InspectionStatus` |
| JWT role `CleanupTeam` | Backend: **`Cleaner`** |
| 1 navigator chung | **Tách root navigator** theo shell |

**Shared:** `api/`, auth/envelope, `ReportStatus`, `AssignmentStatus`, refresh token.

---

## 2. Lifecycle tóm tắt (ai giao ai)

```
Citizen  POST /reports          → Submitted (auto-route office/dept)
LEO      PUT  /verify           → Verified
  ├─ LEO   POST /assign         → InProgress → team cộng đồng xử lý → Resolved → Citizen close → Closed
  └─ LEO   POST /dispatch-to-company → vẫn Verified
         CM POST /assign-company-team → InProgress → CompanyStaff xử lý → Resolved → ...

Song song (không đổi Report.status):
LEO POST /reports/{id}/inspections → InspectionReport Draft → Inspector → Closed / ClosedNoViolation
```

Chi tiết domain: `src/Greenlens.Domain/Entities/Report.cs`, `InspectionReport.cs`.  
Tài liệu BE: [`REPORT_LIFECYCLE.md`](./REPORT_LIFECYCLE.md) (nếu có cập nhật v3).

### `ReportStatus` (7 giá trị — UI badge)

| Status | Ý nghĩa ngắn |
|--------|----------------|
| `Submitted` | Chờ LEO xác minh |
| `Verified` | Đã xác minh, chờ giao việc |
| `InProgress` | Team đang xử lý |
| `Resolved` | Xong — citizen có thể đóng/mở lại |
| `Closed` | Kết thúc |
| `Rejected` | LEO từ chối |
| `Duplicate` | Trùng báo cáo |

### `AssignmentStatus` (từng team trên 1 report)

`Assigned` → `InProgress` → `Completed` | `Declined`

---

## 3. Citizen — ✅ (bổ sung nếu thiếu)

| Màn | API |
|-----|-----|
| Home map + pin | `GET /map/reports`, `GET /map/summary` |
| Tab báo cáo | `GET /reports/my` |
| Chi tiết | `GET /reports/{id}`, `GET /reports/{id}/history` |
| Đóng / mở lại | `PUT /reports/{id}/close`, `PUT /reports/{id}/reopen` |
| Tạo báo cáo | `POST /reports/analyze`, `POST /reports` |

**Docs:**

- [`fe-citizen-map-report-detail.md`](./fe-citizen-map-report-detail.md)
- [`fe-citizen-reports-tab-detail.md`](./fe-citizen-reports-tab-detail.md)
- [`fe-citizen-map-viewport-summary.md`](./fe-citizen-map-viewport-summary.md)
- [`CREATE_POLLUTION_REPORT_FLOW.md`](./CREATE_POLLUTION_REPORT_FLOW.md)
- [`MOBILE_AUTH_INTEGRATION.md`](./MOBILE_AUTH_INTEGRATION.md)

---

## 4. Field worker — Cleaner ✅ + CompanyStaff (refactor chung)

Backend **dùng chung** `TeamsController` + progress/resolve trên `ReportsController`.

### 4.1 API

| Bước | Method | Path | Ghi chú |
|------|--------|------|---------|
| Profile team | GET | `/teams/my-profile` | Mọi member |
| Danh sách task | GET | `/teams/my-tasks?assignmentStatus=` | Filter chip |
| Chi tiết | GET | `/teams/my-tasks/{reportId}` | Flags: `canDecline`, `canUpdateProgress`, `canResolve` |
| Chấp nhận | PUT | `/teams/my-tasks/{reportId}/accept` | **Team leader** |
| Từ chối | PUT | `/teams/my-tasks/{reportId}/decline` | Leader, ≤2h, reason ≥20 |
| Tiến độ | PUT | `/reports/{reportId}/progress` | Leader, multipart |
| Hoàn thành | PUT | `/reports/{reportId}/resolve` | Leader, ≥2 `afterImageUrls` |
| Lịch sử tiến độ | GET | `/teams/my-progress` | Leader |

**Docs:** [`cleaner-progress-resolve-fe-guide.md`](./cleaner-progress-resolve-fe-guide.md), [`api-cleanup-team-flow.md`](./api-cleanup-team-flow.md)

### 4.2 Màn hình `FieldWorkerShell`

| Màn | Mô tả |
|-----|--------|
| Task list | Tab/filter: Chờ nhận · Đang làm · Xong · Từ chối |
| Task detail | Map, ảnh before, waste tags, SLA; nút theo flags API |
| Progress | % + note + ảnh |
| Resolve | ≥2 ảnh after |
| Team (optional) | `my-profile` |
| Profile | `GET /users/me` |

### 4.3 Cleaner vs CompanyStaff

| | Cleaner | CompanyStaff |
|--|---------|--------------|
| API | Giống hệt | Giống hệt |
| Ai assign | LEO `POST /reports/{id}/assign` | CM `POST /reports/{id}/assign-company-team` |
| Mobile | Cùng `FieldWorkerModule` | Chỉ khác branding/copy |

---

## 5. Inspector — ❌ module mới

**Không** dùng `PUT /reports/{id}/resolve`. Luồng chính = **`InspectionReport`**.

LEO tạo hồ sơ (web / phase sau): `POST /v1/reports/{reportId}/inspections`  
Inspector mobile **nhận việc** từ queue.

### 5.1 API

| Màn | Method | Path |
|-----|--------|------|
| Queue | GET | `/inspections/queue?status=` |
| Chi tiết | GET | `/inspections/{id}` |
| Biên bản hiện trường | PUT | `/inspections/{id}/details` | Draft only |
| Ban hành QĐ phạt | PUT | `/inspections/{id}/issue-penalty` | Team leader |
| Không đủ căn cứ | PUT | `/inspections/{id}/close-no-violation` | reason ≥50 |
| Ghi nhận nộp phạt | PUT | `/inspections/{id}/record-payment` |
| Đóng hồ sơ | PUT | `/inspections/{id}/close` | Sau Paid |

Read-only link report: `GET /reports/{id}/inspections`

### 5.2 `InspectionStatus`

```
Draft → PenaltyIssued → Paid | PartiallyPaid | Overdue → Closed
Draft → ClosedNoViolation
```

### 5.3 `InspectorShell` — tab gợi ý

| Tab | API chính |
|-----|-----------|
| Hồ sơ | `/inspections/queue` |
| Chi tiết + workflow | `/inspections/{id}` + PUT actions |
| Team | `/teams/my-profile` |
| Profile | Auth chung |

> `TeamsController` cho Inspector vào `my-tasks` — **phase 1 có thể bỏ qua**; tập trung `/inspections/*`.

**Swagger:** `InspectionsController`, `ReportsController` `POST/GET .../inspections`.

---

## 6. Công ty — CompanyManager ❌ + Staff (FieldWorker)

### 6.1 Hai role

| Role | Shell |
|------|--------|
| **CompanyManager** | `CompanyManagerShell` |
| **CompanyStaff** | `FieldWorkerShell` (mục 4) |

### 6.2 CompanyManager — API

| Màn | API |
|-----|-----|
| Công ty tôi | `GET /companies/my` |
| Chờ phân công | `GET /reports/company-queue` |
| Phân công team | `POST /reports/{id}/assign-company-team` |
| Đã giao / theo dõi | `GET /reports/company-assignments` |
| Tiến độ 1 báo cáo | `GET /reports/company-assignments/{reportId}` |
| Teams | `GET/POST/PUT/DELETE /teams/company-teams*` |
| Thành viên team | `POST/DELETE /teams/company-teams/{id}/members` |
| Nhân viên | `GET/POST /companies/my/staff`, `PUT .../status` |

### 6.3 Flow CM

```
LEO POST /reports/{id}/dispatch-to-company  (Verified + AssignedCompanyId)
  → CM GET /reports/company-queue
  → CM POST /reports/{id}/assign-company-team  (Verified → InProgress)
  → Staff GET /teams/my-tasks  (FieldWorkerShell)
  → CM GET /reports/company-assignments  (theo dõi)
```

### 6.4 `CompanyManagerShell` — tab gợi ý

| Tab | Mô tả |
|-----|--------|
| Chờ giao | `company-queue` |
| Đang chạy | `company-assignments` + filter |
| Teams | CRUD `company-teams` |
| Nhân sự | `companies/my/staff` |
| Công ty | `companies/my` |

**Onboarding:** CM login MK tạm → đổi MK → công ty Active. CM tạo Staff → Staff vào FieldWorker.

**Swagger:** `CompaniesController`, `ReportsController` (company-*), `TeamsController` (company-teams).

---

## 7. Ma trận role → API

| API | Citizen | Cleaner | Co.Staff | Inspector | CM |
|-----|:-------:|:-------:|:--------:|:---------:|:--:|
| `/reports` POST, `/my`, `/map/*` | ✅ | | | | |
| `/teams/my-tasks/*` | | ✅ | ✅ | ⚠️ | |
| `/reports/*/progress`, `/resolve` | | ✅ | ✅ | ❌ | |
| `/inspections/*` | | | | ✅ | |
| `/reports/company-*` | | | | | ✅ |
| `/teams/company-teams/*`, `/companies/my*` | | | | | ✅ |

---

## 8. Thứ tự implement (mobile)

### Sprint A — Refactor nền

1. `RoleRouter` sau login  
2. Đổi tên module Cleanup → **`FieldWorker`**  
3. Enum UI khớp BE (bỏ status report không tồn tại)  
4. Envelope + refresh token thống nhất  

### Sprint B — CompanyStaff (nhỏ)

1. Login `CompanyStaff` → `FieldWorkerShell`  
2. QA task do CM assign  

### Sprint C — CompanyManager

1. `companies/my` + `company-queue`  
2. Assign team + `company-assignments`  
3. CRUD team/staff (có thể web trước)  

### Sprint D — Inspector

1. `inspections/queue` + detail  
2. `details` → `issue-penalty`  
3. `record-payment`, `close`, `close-no-violation`  

### Sprint E — Citizen polish

1. Map summary card ([`fe-citizen-map-viewport-summary.md`](./fe-citizen-map-viewport-summary.md))  
2. Report detail dùng chung component (owner vs read-only)  

---

## 9. Cấu trúc thư mục gợi ý

```
src/
  modules/
    auth/
    citizen/              ✅
    fieldWorker/            ← từ cleanup/ (Cleaner + CompanyStaff)
    inspector/              ← mới
    companyManager/         ← mới
  shared/
    StatusBadge             Report | Assignment | Inspection
    ReportMediaGallery
    SlaCountdown
    MapPreview
```

---

## 10. Test & Swagger

- Tài khoản seed: [`SEED_ACCOUNTS.md`](./SEED_ACCOUNTS.md)  
- Swagger: `/swagger` — tags `Cleaner Dashboard`, `Inspection Dashboard`, `Company Dashboard`  
- Mỗi role: login → thử API đúng shell → xác nhận **403** khi gọi API role khác  

---

## 11. Definition of Done

- [ ] Mỗi role chỉ vào shell của mình sau login  
- [ ] Cleaner + CompanyStaff: một `FieldWorkerModule`, QA cả hai  
- [ ] Inspector: không gọi `resolve` report  
- [ ] CM: queue → assign → thấy tiến độ `company-assignments`  
- [ ] Parse envelope `{ code, message, status, data }`  
- [ ] Không hiển thị `PenaltyIssued` trên Report  

---

## 12. Tài liệu liên quan (index)

| Chủ đề | File |
|--------|------|
| Auth mobile | [`MOBILE_AUTH_INTEGRATION.md`](./MOBILE_AUTH_INTEGRATION.md) |
| Citizen map/detail | [`fe-citizen-map-report-detail.md`](./fe-citizen-map-report-detail.md) |
| Citizen tab reports | [`fe-citizen-reports-tab-detail.md`](./fe-citizen-reports-tab-detail.md) |
| Citizen map summary | [`fe-citizen-map-viewport-summary.md`](./fe-citizen-map-viewport-summary.md) |
| Tạo báo cáo | [`CREATE_POLLUTION_REPORT_FLOW.md`](./CREATE_POLLUTION_REPORT_FLOW.md) |
| Field worker API | [`cleaner-progress-resolve-fe-guide.md`](./cleaner-progress-resolve-fe-guide.md) |
| Team workflow (sửa enum khi đọc) | [`fe-team-workflow-guide.md`](./fe-team-workflow-guide.md) |
| Lifecycle BE | [`REPORT_LIFECYCLE.md`](./REPORT_LIFECYCLE.md) |

---

**Phiên bản:** 1.0 — 2026-06-01  
**Đồng bộ backend:** `greenlens-service` v3.0 (LEO verify, company dispatch, Inspection sub-process).
