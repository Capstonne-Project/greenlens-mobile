# Gamification Module — API & Architecture Guide

> **Branch:** `feature/gamification-module`
> **Business Rules:** BR-GAM-001..006 (SU26SE049_BusinessRules_v1.2)
> **Date:** 2026-06-26

---

## 1. Tổng quan

Module Gamification khuyến khích Citizen tích cực báo cáo ô nhiễm bằng hệ thống:

- **Điểm thưởng** (Points) — cộng/trừ tự động khi báo cáo thay đổi trạng thái
- **Cấp độ** (Levels L1–L5) — tính từ tổng điểm
- **Huy hiệu** (Badges) — trao tự động khi đạt điều kiện
- **Bảng xếp hạng** (Leaderboard) — top N theo tuần/tháng/năm
- **Chống gian lận** (Fraud Lock) — Admin khóa tài khoản + trừ hết điểm

---

## 2. Công thức điểm (BR-GAM-001)

| Sự kiện                                             | Điểm | PointReason Enum  |
| --------------------------------------------------- | :--: | ----------------- |
| Report được LEO **xác minh** (Submitted → Verified) | +10  | `ReportVerified`  |
| Report **giải quyết xong** (InProgress → Resolved)  | +20  | `ReportResolved`  |
| Biên bản phạt được lập (InspectionReport)           | +20  | `PenaltyIssued`   |
| Report trùng lặp được merge                         |  +5  | `DuplicateReport` |
| Report bị **từ chối** (Submitted → Rejected)        |  -5  | `ReportRejected`  |
| Gian lận — Admin khóa tài khoản                     | -ALL | `FraudPenalty`    |

### Idempotency

Mỗi cặp `(ReportId, PointReason)` chỉ được tính **một lần**. Nếu hệ thống retry hoặc event phát lại, điểm không bị cộng đôi.

---

## 3. Cấp độ (BR-GAM-003)

| Level | Tổng điểm     |
| :---: | ------------- |
|  L1   | 0 – 99        |
|  L2   | 100 – 499     |
|  L3   | 500 – 1,499   |
|  L4   | 1,500 – 4,999 |
|  L5   | ≥ 5,000       |

Khi level tăng, hệ thống raise `LevelUpEvent` (có thể dùng cho push notification sau này).

---

## 4. Huy hiệu (BR-GAM-004)

| Code | Tên (VI) | Điều kiện | Trạng thái |
|------|----------|-----------|------------|
| `first_report` | Người Khởi Đầu | ≥ 1 report verified | ✅ Auto-award + `BadgeEarned` noti |
| `eco_warrior` | Chiến Binh Xanh | ≥ 10 reports verified | ✅ Auto-award + noti |
| `green_champion` | Nhà Vô Địch Xanh | ≥ 50 reports verified | ✅ Auto-award + noti |
| `earth_guardian` | Người Bảo Vệ Trái Đất | ≥ 100 reports verified | ✅ Auto-award + noti |
| `streak_7d` | Bền Bỉ 7 Ngày | Gửi report 7 ngày liên tiếp (VN calendar) | ✅ Auto-award + noti |
| `streak_30d` | Kiên Trì 30 Ngày | Gửi report 30 ngày liên tiếp (VN calendar) | ✅ Auto-award + noti |
| `duplicate_finder` | Người Phát Hiện Trùng | ≥ 5 báo cáo status `Duplicate` | ✅ Auto-award + noti |
| `community_voice` | Tiếng Nói Cộng Đồng | Có báo cáo `ReporterCount ≥ 10` | ✅ Auto-award + noti |
| `rising_star` / `eco_expert` / `green_legend` | Level badges | ≥ 100 / 1.500 / 5.000 điểm | ✅ Auto-award + noti |
| `hotspot_hunter` | Thợ Săn Điểm Nóng | 3 reports trong hotspot | ⚠️ Chờ BR-MAP-010 |

Badges được kiểm tra tự động sau mỗi lần cộng điểm (`CheckBadgesCommand`) và sau khi LEO merge duplicate (check lại primary reporter cho `community_voice`).

**Streak timezone:** convert `CreatedAt` (UTC timestamptz) sang ngày calendar `Asia/Ho_Chi_Minh` **chỉ trong Application** — không đổi PostgreSQL server timezone.

**Level up:** `LevelUpEvent` → `LevelUpNotificationHandler` → template `level_up` (`{level}`).

---

## 5. API Endpoints

### 5.1 `GET /v1/gamification/my-points`

**Auth:** Citizen (Bearer token)

**Query params:**
| Param | Type | Default |
|---|---|---|
| `page` | int | 1 |
| `pageSize` | int | 20 |

**Response:**

```json
{
  "code": "SUCCESS",
  "message": "Thành công",
  "data": {
    "totalPoints": 150,
    "level": 2,
    "isLocked": false,
    "lockedUntil": null,
    "recentTransactions": [
      {
        "id": "...",
        "points": 10,
        "reason": "ReportVerified",
        "reportId": "...",
        "createdAt": "2026-06-26T12:00:00Z"
      }
    ],
    "totalTransactions": 15
  }
}
```

---

### 5.2 `GET /v1/gamification/my-badges`

**Auth:** Citizen (Bearer token)

**Response:**

```json
{
  "code": "SUCCESS",
  "data": [
    {
      "badgeId": "...",
      "code": "first_report",
      "nameVi": "Người khởi đầu",
      "nameEn": "First Report",
      "description": "Gửi báo cáo ô nhiễm đầu tiên",
      "iconUrl": null,
      "awardedAt": "2026-06-20T08:00:00Z"
    }
  ]
}
```

---

### 5.3 `GET /v1/gamification/leaderboard`

**Auth:** Public (không cần token)

**Query params:**
| Param | Type | Default | Values |
|---|---|---|---|
| `period` | enum | `Monthly` | `Weekly`, `Monthly`, `Yearly` |
| `top` | int | 10 | 1–100 |

**Response:**

```json
{
  "code": "SUCCESS",
  "data": {
    "period": "Monthly",
    "periodStart": "2026-06-01T00:00:00Z",
    "periodEnd": "2026-07-01T00:00:00Z",
    "entries": [
      {
        "rank": 1,
        "userId": "...",
        "displayName": "Nguyễn Văn A",
        "avatarUrl": "https://...",
        "points": 320,
        "level": 3
      }
    ]
  }
}
```

---

### 5.4 `POST /v1/gamification/{userId}/lock`

**Auth:** Admin only

**Request body:**

```json
{
  "reason": "Phát hiện gửi báo cáo giả để farm điểm",
  "lockDays": 30
}
```

**Response:**

```json
{
  "code": "SUCCESS",
  "data": {
    "pointsDeducted": -150,
    "lockedUntil": "2026-07-26T12:00:00Z"
  }
}
```

---

## 6. Kiến trúc & Cơ chế hoạt động

### 6.1 Luồng cộng điểm (Event-Driven, Decoupled)

```
Report.Verify()
  └→ AddDomainEvent(ReportVerifiedEvent)
       └→ UnitOfWork.SaveChangesAsync()
            └→ MediatR.Publish(ReportVerifiedEvent)
                 └→ ReportVerifiedPointsHandler
                      ├→ AwardPointsCommand(userId, +10, ReportVerified, reportId)
                      └→ CheckBadgesCommand(userId)
```

> **Decoupled:** Existing Report handlers (VerifyReportCommandHandler, etc.) không bị sửa đổi.
> Domain event được raise trong entity method, dispatch trong UnitOfWork.

### 6.2 Database Schema

```
user_points (1 per user)
├── id (PK)
├── user_id (FK → users, UNIQUE)
├── total_points (int, default 0)
├── is_locked (bool)
├── locked_until (timestamp?)
├── locked_reason (varchar 500?)
└── created_at

point_transactions (N per user)
├── id (PK)
├── user_points_id (FK → user_points)
├── points (int)
├── reason (varchar 50, enum string)
├── report_id (guid?)
├── created_at
└── UNIQUE INDEX (user_points_id, report_id, reason) WHERE report_id IS NOT NULL

badges (seed data)
├── id (PK)
├── code (varchar 50, UNIQUE)
├── name_vi, name_en (varchar 100)
├── description (varchar 500?)
├── icon_url (varchar 500?)
├── required_points (int?)
├── required_report_count (int?)
├── is_active (bool)
└── created_at

user_badges (N:N join)
├── id (PK)
├── user_id (FK → users)
├── badge_id (FK → badges)
├── awarded_at
├── report_id (guid?)
└── UNIQUE INDEX (user_id, badge_id)
```

### 6.3 Background Job (Hangfire)

| Job                    | Cron                          | Mô tả                                      |
| ---------------------- | ----------------------------- | ------------------------------------------ |
| `leaderboard-snapshot` | `5 0 * * *` (00:05 UTC daily) | Snapshot top-100 leaderboard cho 3 periods |

Dashboard: `/hangfire` (cần auth filter cho production).

---

## 7. Deferred / TODO

| Item                                 | Phụ thuộc                                  |
| ------------------------------------ | ------------------------------------------ |
| Badge `hotspot_hunter` auto-award    | BR-MAP-010 hotspot detection               |
| Badge `streak_7d` auto-award         | Consecutive-day tracking logic             |
| Badge `verified_citizen`             | KYC module                                 |
| BR-GAM-002 Anonymous opt-out         | Privacy settings trên User                 |
| Leaderboard materialized cache table | Performance optimization khi user base lớn |
| Hangfire dashboard production auth   | `IDashboardAuthorizationFilter`            |
| Push notification khi level up       | BR-NTF-001 Notification module             |
