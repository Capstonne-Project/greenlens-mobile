# GreenLens Mobile — Handoff tổng hợp (BE → App)

> **Mục đích:** Một file duy nhất cho team mobile: BE đã làm gì, app cần làm gì, account test, API theo role, và link tài liệu chi tiết.  
> **Cập nhật:** 2026-06-01 · Backend v3.0 (Report lifecycle + InspectionReport sub-process)

---

## 1. Môi trường & envelope

| Môi trường | Base URL |
|------------|----------|
| Local | `http://localhost:5000/v1` |
| Dev | `https://api-dev.greenlens.com.vn/v1` |

**Mọi response:**

```json
{
  "code": "SUCCESS",
  "message": "...",
  "status": 200,
  "data": { }
}
```

- Auth: `Authorization: Bearer {accessToken}`
- i18n: `Accept-Language: vi-VN` hoặc `en-US`
- Chi tiết auth: [`MOBILE_AUTH_INTEGRATION.md`](./MOBILE_AUTH_INTEGRATION.md)

**Chạy seed mobile (local):** `dotnet run` ở project Api (Development) — idempotent, không duplicate.

---

## 2. BE vừa hoàn thành (handoff sprint)

### 2.1. Tài liệu API mới / cập nhật

| File | Nội dung |
|------|----------|
| [`fe-inspection-api-guide.md`](./fe-inspection-api-guide.md) | 8 endpoint Inspector + enum + flags + errors |
| [`fe-company-manager-api-guide.md`](./fe-company-manager-api-guide.md) | 14 endpoint CM + staff + assign body |
| [`SEED_ACCOUNTS.md`](./SEED_ACCOUNTS.md) | 6 account mobile + report mẫu |
| [`cleaner-progress-resolve-fe-guide.md`](./cleaner-progress-resolve-fe-guide.md) | Progress multipart + resolve (không có endpoint upload riêng) |
| [`MOBILE_AUTH_INTEGRATION.md`](./MOBILE_AUTH_INTEGRATION.md) | Role string v3.0, profile path, ma trận role→API |
| [`MOBILE_APPS_MASTER_PLAN.md`](./MOBILE_APPS_MASTER_PLAN.md) | Shell theo role, sprint (đã sửa `/users/profile`) |

### 2.2. Thay đổi code BE (behavior / contract)

| Hạng mục | Chi tiết |
|----------|----------|
| **Mobile seed** | `MobileDemoSeeder` — company, teams, 5 report QA (ward `27145`) |
| **Inspection BR-INS-012** | Chỉ **Team Leader** của team được gán mới mutate (details, issue-penalty, close-no-violation, record-payment, close) |
| **Citizen close/reopen** | Chỉ **reporter** — lỗi `NOT_REPORT_OWNER` (403) nếu user khác |
| **Inspection detail** | Thêm flags: `canEditDetails`, `canIssuePenalty`, `canCloseNoViolation`, `canRecordPayment`, `canClose` |
| **Inspection queue** | Pagination `{ items, pagination }` (giống company APIs) + `address`, `wardCode` trên item |
| **Company queue** | Thêm `latitude`, `longitude` trên item |

---

## 3. Tài khoản test (copy-paste QA)

Password chung: **`Mobile@123`** · Ward demo: **27145** (TP.HCM Phường 1)

| Role | Email | Dữ liệu mẫu |
|------|-------|-------------|
| **Citizen** | `citizen.mobile@greenlens.dev` | Reporter; `REP-MOB-RES001` (Resolved → test close/reopen) |
| **Cleaner (leader)** | `cleaner.leader.mobile@greenlens.dev` | Task `REP-MOB-CLN001` InProgress |
| **Cleaner (member)** | `cleaner.member.mobile@greenlens.dev` | Cùng team, **không** gọi được progress/resolve |
| **Inspector (leader)** | `inspector.leader.mobile@greenlens.dev` | Queue Draft `REP-MOB-INS001` |
| **CompanyManager** | `cm.mobile@greenlens.dev` | Queue `REP-MOB-CQ001` (Verified, chờ assign) |
| **CompanyStaff (leader)** | `staff.leader.mobile@greenlens.dev` | Task `REP-MOB-TSK001` InProgress 40% |

**Report codes demo:**

| Code | Status | Ai test |
|------|--------|---------|
| `REP-MOB-CQ001` | Verified + dispatched company | CM assign team |
| `REP-MOB-TSK001` | InProgress (company team) | CompanyStaff progress/resolve |
| `REP-MOB-CLN001` | InProgress (community team) | Cleaner leader |
| `REP-MOB-INS001` | Inspection Draft | Inspector workflow |
| `REP-MOB-RES001` | Resolved | Citizen close / reopen |

---

## 4. Role → shell app → API chính

| `data.user.role` (login) | Shell mobile | API chính |
|--------------------------|--------------|-----------|
| `Citizen` | ✅ Citizen | `/reports`, `/map/*`, close/reopen |
| `Cleaner` | ✅ Field worker | `/teams/my-tasks`, progress, resolve |
| `CompanyStaff` | ✅ Field worker (cùng UI Cleaner) | Giống Cleaner |
| `Inspector` | 🔧 Hoàn thiện shell | `/inspections/*` |
| `CompanyManager` | 🔧 Hoàn thiện shell | `/companies/my`, `/reports/company-*`, `/teams/company-teams` |
| `LEO`, `DEO`, `Admin` | Web (ngoài mobile) | — |

> JWT **không** có `teamId`, `companyId`. Sau login gọi API context: `my-tasks` / `companies/my` / `inspections/queue`.

**Profile:** `GET /v1/users/profile` — **không** dùng `/users/me`.

---

## 5. App PHẢI sửa (breaking / sai contract)

| # | Vấn đề FE cũ | BE thật |
|---|--------------|---------|
| 1 | `POST assign-company-team` body `{ teamId }` | `{ "teams": [{ "teamId": "uuid", "note": "..." }] }` |
| 2 | `inspections/queue` flat `totalCount, page, pageSize` | `{ "items": [], "pagination": { "page", "pageSize", "totalItems", "totalPages", "hasNext", "hasPrev" } }` |
| 3 | Profile `/users/me` | `/users/profile` |
| 4 | Role `CleanupTeam`, `Officer` | `Cleaner`, `CompanyStaff`, `Inspector`, `CompanyManager`, `LEO`, `DEO` |
| 5 | `POST /reports/{id}/progress/images` | **Không tồn tại** — upload trong `PUT /reports/{id}/progress` multipart field `images` |
| 6 | Tự suy `canIssuePenalty` từ status | Dùng flags từ `GET /inspections/{id}` |
| 7 | Create staff response | `tempPassword` trong response 201 (1 lần duy nhất) |

---

## 6. API theo role (cheat sheet)

### Citizen ✅

| Việc | Doc |
|------|-----|
| Map + viewport summary | [`fe-citizen-map-viewport-summary.md`](./fe-citizen-map-viewport-summary.md) |
| Pin → detail, close/reopen | [`fe-citizen-map-report-detail.md`](./fe-citizen-map-report-detail.md) |
| Tab Reports → detail | [`fe-citizen-reports-tab-detail.md`](./fe-citizen-reports-tab-detail.md) |

**Close / reopen:** `PUT /reports/{id}/close`, `PUT /reports/{id}/reopen` — chỉ reporter, status `Resolved`.

---

### Cleaner & CompanyStaff ✅

| Method | Path |
|--------|------|
| GET | `/teams/my-tasks` |
| PUT | `/teams/my-tasks/{assignmentId}/accept` |
| PUT | `/teams/my-tasks/{assignmentId}/decline` |
| PUT | `/reports/{reportId}/progress` (multipart) |
| PUT | `/reports/{reportId}/resolve` (JSON `afterImageUrls[]`) |

Chi tiết: [`cleaner-progress-resolve-fe-guide.md`](./cleaner-progress-resolve-fe-guide.md), [`fe-team-workflow-guide.md`](./fe-team-workflow-guide.md)

**Lưu ý:** Chỉ **Team Leader** mới accept/progress/resolve. Member login → 422 `NOT_TEAM_LEADER`.

---

### Inspector 🔧

| # | Method | Path |
|---|--------|------|
| 1 | GET | `/inspections/queue` |
| 2 | GET | `/inspections/{id}` |
| 3 | PUT | `/inspections/{id}/details` |
| 4 | PUT | `/inspections/{id}/issue-penalty` |
| 5 | PUT | `/inspections/{id}/close-no-violation` |
| 6 | PUT | `/inspections/{id}/record-payment` |
| 7 | PUT | `/inspections/{id}/close` |
| 8 | GET | `/reports/{reportId}/inspections` |

Chi tiết JSON + enum + errors: [`fe-inspection-api-guide.md`](./fe-inspection-api-guide.md)

**`InspectionStatus`:** `Draft` → `PenaltyIssued` → `PartiallyPaid` / `Paid` / `Overdue` → `Closed` · hoặc `ClosedNoViolation`

---

### CompanyManager 🔧

| # | Method | Path |
|---|--------|------|
| 1 | GET | `/companies/my` |
| 2 | GET | `/reports/company-queue` |
| 3 | POST | `/reports/{id}/assign-company-team` |
| 4 | GET | `/reports/company-assignments` |
| 5 | GET | `/reports/company-assignments/{reportId}` |
| 6–11 | * | `/teams/company-teams` CRUD + members |
| 12–14 | * | `/companies/my/staff` |

Chi tiết: [`fe-company-manager-api-guide.md`](./fe-company-manager-api-guide.md)

---

## 7. Luồng report (tóm tắt — app không cần implement LEO)

```
Citizen POST /reports → Submitted
LEO verify → Verified
  ├─ LEO assign community team → InProgress → team resolve → Resolved → Citizen close → Closed
  └─ LEO dispatch-to-company → Verified (CM queue)
        → CM assign-company-team → InProgress → staff resolve → Resolved → Citizen close

Song song: LEO POST /reports/{id}/inspections → InspectionReport (Inspector xử lý)
```

Chi tiết lifecycle: [`REPORT_LIFECYCLE.md`](./REPORT_LIFECYCLE.md)

---

## 8. Checklist app — làm theo thứ tự

### P0 — Unblock QA

- [ ] Cập nhật types/services theo mục **§5 Breaking**
- [ ] Role router: map đúng 8 role v3.0 sau login
- [ ] Inspector: wire 7 endpoint + parse `can*` flags
- [ ] CM: wire queue → assign (`teams[]`) → assignments
- [ ] Login 6 account seed → smoke từng shell

### P1 — E2E happy path

- [ ] **Inspector:** queue → detail → details → issue-penalty → record-payment → close
- [ ] **CM:** company-queue → assign team → thấy trong company-assignments
- [ ] **Staff leader:** my-tasks → progress (multipart) → presign after → resolve
- [ ] **Cleaner leader:** tương tự staff trên `REP-MOB-CLN001`
- [ ] **Citizen:** `REP-MOB-RES001` → close; reopen (max 2)

### P2 — Polish

- [ ] Map CM queue với `latitude`/`longitude`
- [ ] Error toast theo `code` (422/403/404)
- [ ] `mustChangePassword` flow cho CM/staff mới tạo
- [ ] Refresh token rotation (24h access / 30d refresh)

---

## 9. Error codes hay gặp (mobile)

| Code | HTTP | Khi nào |
|------|------|---------|
| `NOT_TEAM_LEADER` | 422 | Member gọi progress/resolve/inspection mutation |
| `NOT_ASSIGNED_TO_YOUR_TEAM` | 403 | Inspector sai team |
| `NOT_REPORT_OWNER` | 403 | User khác close/reopen |
| `REOPEN_LIMIT_REACHED` | 422 | Reopen > 2 lần |
| `INSPECTION_INVALID_STATUS` | 422 | Action không hợp status |
| `CLOSE_REASON_TOO_SHORT` | 422 | close-no-violation &lt; 50 ký tự |
| `AT_LEAST_ONE_TEAM` | 422 | assign body thiếu `teams` |

---

## 10. Index tài liệu liên quan

| Chủ đề | File |
|--------|------|
| **Handoff này** | `MOBILE_APP_HANDOFF.md` |
| Master plan mobile | `MOBILE_APPS_MASTER_PLAN.md` |
| Auth | `MOBILE_AUTH_INTEGRATION.md` |
| FE yêu cầu gốc | `fe-be-handoff-requirements.md`, `fe-be-handoff-request.md` |
| Seed accounts | `SEED_ACCOUNTS.md` |
| Inspector API | `fe-inspection-api-guide.md` |
| Company Manager API | `fe-company-manager-api-guide.md` |
| Cleaner / Staff field | `cleaner-progress-resolve-fe-guide.md` |
| Citizen map | `fe-citizen-map-viewport-summary.md`, `fe-citizen-map-report-detail.md` |
| Citizen reports tab | `fe-citizen-reports-tab-detail.md` |
| Report lifecycle | `REPORT_LIFECYCLE.md` |
| API conventions | `00_API_CONVENTIONS.md` (nếu có trong repo docs) |

---

## 11. Liên hệ / ghi chú

- BE không đổi kiến trúc Clean Architecture — mọi thay đổi là extend slice/controller/seed hiện có.
- Production **không** seed account mobile.
- Nếu dev server chưa có data mobile: pull BE mới nhất + restart Api (Development) một lần.

**Câu hỏi BE còn mở:** ping team backend kèm `X-Request-ID` + `code` lỗi từ envelope.
