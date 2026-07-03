# Inspector — API Guide (Mobile / FE)

> **Prefix:** `/v1` · **Envelope:** `{ code, message, status, data }`  
> **Controller:** `InspectionsController` · **Role:** `Inspector` (Team Leader thực thi mutation)  
> **Seed QA:** `inspector.leader.mobile@greenlens.dev` / `Mobile@123` — xem [`SEED_ACCOUNTS.md`](./SEED_ACCOUNTS.md)

---

## Enum `InspectionStatus`

| Value | Mô tả |
|-------|--------|
| `Draft` | LEO tạo, chờ điều tra / ban hành QĐ |
| `PenaltyIssued` | Đã ban hành QĐ, chờ nộp phạt |
| `PartiallyPaid` | Nộp một phần |
| `Overdue` | Quá hạn nộp (job đánh dấu) |
| `Paid` | Nộp đủ, chờ đóng hồ sơ |
| `Closed` | Đã đóng sau nộp phạt |
| `ClosedNoViolation` | Không đủ căn cứ vi phạm |

---

## 1. Danh sách queue — `GET /v1/inspections/queue`

**Auth:** Bearer · Role `Inspector` hoặc `Admin`

**Query:**

| Param | Default | Max |
|-------|---------|-----|
| `page` | 1 | — |
| `pageSize` | 20 | 100 |
| `status` | (optional) | `InspectionStatus` |

**Response 200 `data`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "reportId": "uuid",
      "reportCode": "REP-MOB-INS001",
      "status": "Draft",
      "address": "123 Nguyễn Huệ, Phường 1, TP.HCM",
      "wardCode": "27145",
      "violatorName": "Cơ sở Demo XYZ",
      "violationDescription": "Phát hiện xả thải trái phép...",
      "violationLevel": null,
      "penaltyAmount": null,
      "isRepeatOffender": false,
      "slaInspectionDueAt": "2026-06-08T00:00:00Z",
      "createdAt": "2026-06-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

> **Pagination:** cùng shape với `company-queue` (`pagination` object, không phải flat `totalCount`).

---

## 2. Chi tiết — `GET /v1/inspections/{id}`

**Auth:** `Inspector`, `LEO`, `Admin`

**Response 200 `data` — capability flags (BE trả sẵn):**

| Field | Ý nghĩa |
|-------|---------|
| `canEditDetails` | `status === Draft` |
| `canIssuePenalty` | `status === Draft` |
| `canCloseNoViolation` | `status === Draft` |
| `canRecordPayment` | `PenaltyIssued` / `PartiallyPaid` / `Overdue` |
| `canClose` | `status === Paid` |

```json
{
  "id": "uuid",
  "reportId": "uuid",
  "reportCode": "REP-MOB-INS001",
  "status": "Draft",
  "assignedTeamId": "uuid",
  "assignedTeamName": "Đội thanh tra Mobile Demo",
  "violationDescription": "...",
  "violatorName": "Cơ sở Demo XYZ",
  "violatorAddress": "123 Nguyễn Huệ, Q1",
  "violatorIdentity": "0310999999",
  "violationLevel": null,
  "penaltyAmount": null,
  "penaltyDecisionNumber": null,
  "penaltyIssuedAt": null,
  "penaltyDueDate": null,
  "paidAmount": null,
  "additionalPenaltyMeasures": null,
  "isRepeatOffender": false,
  "createdByOfficerId": "uuid",
  "createdByOfficerName": "LEO ...",
  "issuedByInspectorId": null,
  "issuedByInspectorName": null,
  "slaInspectionDueAt": "2026-06-08T00:00:00Z",
  "closedAt": null,
  "closedReason": null,
  "createdAt": "2026-06-01T00:00:00Z",
  "canEditDetails": true,
  "canIssuePenalty": true,
  "canCloseNoViolation": true,
  "canRecordPayment": false,
  "canClose": false
}
```

---

## 3. Cập nhật biên bản — `PUT /v1/inspections/{id}/details`

**Auth:** `Inspector` · **Chỉ Team Leader** của team được gán

**Body (JSON, tất cả optional):**

```json
{
  "violationDescription": "Mô tả vi phạm sau điều tra",
  "violatorName": "Công ty ABC",
  "violatorAddress": "Địa chỉ hiện trường",
  "violatorIdentity": "0310123456"
}
```

**Response:** 200 envelope, `data: null` (No Content semantics)

**Lỗi:**

| HTTP | Code | Ghi chú |
|------|------|---------|
| 422 | `NOT_INSPECTION_TEAM_LEADER` | Không phải leader |
| 422 | `NOT_ASSIGNED_TO_YOUR_TEAM` | Hồ sơ không thuộc team leader |
| 422 | `INSPECTION_INVALID_STATUS` | Không ở `Draft` |

---

## 4. Ban hành QĐ xử phạt — `PUT /v1/inspections/{id}/issue-penalty`

**Body:**

```json
{
  "violationLevel": "Moderate",
  "penaltyAmount": 5000000,
  "decisionNumber": "QĐ-XP-2026-001",
  "paymentDueDays": 10,
  "additionalMeasures": "Tạm đình chỉ hoạt động 7 ngày"
}
```

`violationLevel`: `Minor` | `Moderate` | `Severe` | `Critical`  
`penaltyAmount`, `paidAmount`: **decimal** (VND)

**Transition:** `Draft` → `PenaltyIssued`

---

## 5. Đóng không vi phạm — `PUT /v1/inspections/{id}/close-no-violation`

**Body:**

```json
{
  "reason": "Sau điều tra hiện trường, không đủ căn cứ xác định vi phạm theo quy định hiện hành (BR-INS-013)."
}
```

`reason` **≥ 50 ký tự**.

---

## 6. Ghi nhận nộp phạt — `PUT /v1/inspections/{id}/record-payment`

**Body:**

```json
{
  "paidAmount": 3000000
}
```

BE cộng dồn `paidAmount`; tự chuyển `PartiallyPaid` hoặc `Paid` khi đủ `penaltyAmount`.

---

## 7. Đóng hồ sơ — `PUT /v1/inspections/{id}/close`

**Body (optional):**

```json
{
  "reason": "Vi phạm đã nộp phạt đầy đủ."
}
```

**Yêu cầu:** `status === Paid`

---

## 8. Danh sách theo báo cáo — `GET /v1/reports/{reportId}/inspections`

**Auth:** theo policy report (LEO/Admin/Citizen owner tùy endpoint report)

**Response `data`:**

```json
{
  "items": [
    {
      "id": "uuid",
      "status": "Draft",
      "violatorName": "...",
      "violationLevel": null,
      "penaltyAmount": null,
      "paidAmount": null,
      "isRepeatOffender": false,
      "createdByOfficerId": "uuid",
      "createdByOfficerName": "...",
      "slaInspectionDueAt": "...",
      "closedAt": null,
      "createdAt": "..."
    }
  ]
}
```

---

## Error codes chung (mutation)

| Code | HTTP | Type |
|------|------|------|
| `NOT_INSPECTION_TEAM_LEADER` | 422 | Chỉ leader |
| `NOT_ASSIGNED_TO_YOUR_TEAM` | 403 | Sai team |
| `INSPECTION_NOT_FOUND` | 404 | — |
| `INSPECTION_INVALID_STATUS` | 422 | Sai trạng thái |
| `CLOSE_REASON_TOO_SHORT` | 422 | Lý do &lt; 50 ký tự |
| `PENALTY_AMOUNT_INVALID` | 422 | amount ≤ 0 |
| `PAYMENT_AMOUNT_INVALID` | 422 | paidAmount ≤ 0 |

---

## Ảnh báo cáo gốc

Inspection **không** có endpoint upload riêng. Ảnh pollution report lấy từ `GET /v1/reports/{id}` → field `media[]` (`type`: `Before`, `After`, …).
