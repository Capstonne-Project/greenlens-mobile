# Mobile — Badge Progress API Guide

> **Ngày:** 2026-08-16  
> **Đối tượng:** Mobile Citizen (`green-lens-app`)  
> **BR:** BR-GAM-004, BR-GAM-005  
> **Endpoint chính:** `GET /v1/gamification/badges`  
> **Mục tiêu:** Hiển thị **12 huy hiệu** kèm **tiến độ đạt được** (`current / target`) trên màn Badges / Gamification Hub.

---

## 0. Tóm tắt 30 giây

- BE **không lưu** progress riêng trong DB — tiến độ được **tính real-time** từ báo cáo, điểm, streak, community cleanup.
- Mobile gọi **`GET /v1/gamification/badges`** (Bearer) → nhận **đủ 12 badge** (đã unlock + chưa unlock) kèm:
  - `currentProgressValue` — đã đạt bao nhiêu
  - `targetProgressValue` — cần bao nhiêu để mở khóa
  - `progressMetric` — loại chỉ số (để label UI)
- **Không** cần catalog local / hardcode điều kiện nữa (trừ icon fallback offline).

---

## 1. Endpoint

### `GET /v1/gamification/badges`

| | |
|---|---|
| **Auth** | Bearer (Citizen) |
| **Query** | Không có |
| **Envelope** | `{ code, message, status, data }` — xem `00_API_CONVENTIONS.md` |

**Response `data`:** mảng `BadgeCatalogItem[]`, sắp xếp: badge đã unlock trước, sau đó theo ngưỡng điểm/báo cáo tăng dần.

### Ví dụ response

```json
{
  "code": "SUCCESS",
  "message": "Thành công",
  "status": 200,
  "data": [
    {
      "badgeId": "a1000001-0000-0000-0000-000000000001",
      "code": "first_report",
      "nameVi": "Người Khởi Đầu",
      "nameEn": "First Reporter",
      "description": "Gửi báo cáo ô nhiễm đầu tiên được xác minh",
      "iconUrl": "https://pub-....r2.dev/badges/icons/first_report.png",
      "isUnlocked": true,
      "awardedAt": "2026-07-20T10:00:00Z",
      "requiredPoints": null,
      "requiredReportCount": 1,
      "requiredStreakDays": null,
      "isFeatured": false,
      "currentProgressValue": 3,
      "targetProgressValue": 1,
      "progressMetric": "verified_reports"
    },
    {
      "badgeId": "a1000001-0000-0000-0000-000000000005",
      "code": "streak_7d",
      "nameVi": "Bền Bỉ 7 Ngày",
      "nameEn": "7-Day Streak",
      "description": "Gửi báo cáo 7 ngày liên tiếp",
      "iconUrl": "https://pub-....r2.dev/badges/icons/streak_7d.png",
      "isUnlocked": false,
      "awardedAt": null,
      "requiredPoints": null,
      "requiredReportCount": null,
      "requiredStreakDays": 7,
      "isFeatured": false,
      "currentProgressValue": 4,
      "targetProgressValue": 7,
      "progressMetric": "streak_days"
    }
  ]
}
```

---

## 2. Schema `BadgeCatalogItem`

| Field | Type | Mô tả |
|-------|------|--------|
| `badgeId` | `uuid` | ID badge |
| `code` | `string` | Mã ổn định — dùng làm key UI / icon fallback |
| `nameVi` / `nameEn` | `string` | Tên hiển thị theo locale app |
| `description` | `string?` | Mô tả điều kiện |
| `iconUrl` | `string?` | URL ảnh (R2/CDN). Null → fallback `assets/badges/{code}.png` |
| `isUnlocked` | `boolean` | `true` = user đã nhận badge |
| `awardedAt` | `ISO8601?` | Thời điểm nhận; `null` nếu chưa unlock |
| `requiredPoints` | `int?` | Ngưỡng điểm (level badges) |
| `requiredReportCount` | `int?` | Ngưỡng số báo cáo (milestone) |
| `requiredStreakDays` | `int?` | Ngưỡng streak (7 / 30) |
| `isFeatured` | `boolean` | Badge đang được chọn hiển thị nổi bật trên profile |
| **`currentProgressValue`** | **`int?`** | **Chỉ số hiện tại của user trên trục progress** |
| **`targetProgressValue`** | **`int?`** | **Mốc cần đạt để unlock** |
| **`progressMetric`** | **`string?`** | **Loại chỉ số — dùng cho label UI** |

> **Lưu ý:** Với badge đã unlock, `currentProgressValue` vẫn trả giá trị thực (có thể **lớn hơn** `targetProgressValue`). Progress bar nên cap ở 100% khi `isUnlocked === true`.

---

## 3. `progressMetric` — label UI (Tiếng Việt gợi ý)

| `progressMetric` | Label ngắn | Label progress bar |
|------------------|------------|--------------------|
| `verified_reports` | Báo cáo xác minh | `{current}/{target} báo cáo` |
| `points` | Điểm tích lũy | `{current}/{target} điểm` |
| `streak_days` | Chuỗi ngày | `{current}/{target} ngày liên tiếp` |
| `duplicate_reports` | Báo cáo trùng | `{current}/{target} báo cáo trùng` |
| `reporter_count` | Xác nhận cộng đồng | `{current}/{target} người cùng báo cáo` |
| `cleanup_events` | Dọn dẹp cộng đồng | `{current}/{target} buổi dọn dẹp` |

---

## 4. Bảng 12 badge — điều kiện & progress

Danh sách active hiện tại (seed `GamificationSeeder`). Badge `hotspot_hunter` **đã xóa** — thay bằng `cleanup_hero`.

| # | `code` | NameVi | `progressMetric` | Target | Cách BE tính `currentProgressValue` |
|---|--------|--------|------------------|--------|--------------------------------------|
| 1 | `first_report` | Người Khởi Đầu | `verified_reports` | 1 | Số báo cáo user có status Verified / InProgress / Resolved / Reopened / Closed |
| 2 | `eco_warrior` | Chiến Binh Xanh | `verified_reports` | 10 | Cùng metric |
| 3 | `green_champion` | Nhà Vô Địch Xanh | `verified_reports` | 50 | Cùng metric |
| 4 | `earth_guardian` | Người Bảo Vệ Trái Đất | `verified_reports` | 100 | Cùng metric |
| 5 | `streak_7d` | Bền Bỉ 7 Ngày | `streak_days` | 7 | Chuỗi ngày **gửi báo cáo** liên tiếp dài nhất (calendar `Asia/Ho_Chi_Minh`) |
| 6 | `streak_30d` | Kiên Trì 30 Ngày | `streak_days` | 30 | Cùng metric |
| 7 | `duplicate_finder` | Người Phát Hiện Trùng | `duplicate_reports` | 5 | Số báo cáo user có status `Duplicate` |
| 8 | `community_voice` | Tiếng Nói Cộng Đồng | `reporter_count` | 10 | `MAX(reporter_count)` trên các báo cáo của user |
| 9 | `rising_star` | Ngôi Sao Đang Lên | `points` | 100 | `user_points.total_points` |
| 10 | `eco_expert` | Chuyên Gia Môi Trường | `points` | 1.500 | Cùng metric |
| 11 | `green_legend` | Huyền Thoại Xanh | `points` | 5.000 | Cùng metric |
| 12 | `cleanup_hero` | Anh Hùng Dọn Dẹp | `cleanup_events` | 2 | Số lần user **Member** check-in tại community cleanup event **Completed** |

**Auto-award:** Tất cả 12 badge đều được kiểm tra tự động qua `CheckBadgesCommand` (sau cộng điểm, merge duplicate, hoàn thành cleanup, job recheck).

---

## 5. UI — Progress bar & trạng thái

### 5.1 Công thức (TypeScript)

```ts
export type ProgressMetric =
  | 'verified_reports'
  | 'points'
  | 'streak_days'
  | 'duplicate_reports'
  | 'reporter_count'
  | 'cleanup_events';

export interface BadgeCatalogItem {
  badgeId: string;
  code: string;
  nameVi: string;
  nameEn: string;
  description: string | null;
  iconUrl: string | null;
  isUnlocked: boolean;
  awardedAt: string | null;
  requiredPoints: number | null;
  requiredReportCount: number | null;
  requiredStreakDays: number | null;
  isFeatured: boolean;
  currentProgressValue: number | null;
  targetProgressValue: number | null;
  progressMetric: ProgressMetric | null;
}

const PROGRESS_LABEL_VI: Record<ProgressMetric, string> = {
  verified_reports: 'báo cáo xác minh',
  points: 'điểm',
  streak_days: 'ngày liên tiếp',
  duplicate_reports: 'báo cáo trùng',
  reporter_count: 'người cùng báo cáo',
  cleanup_events: 'buổi dọn dẹp',
};

export function getBadgeProgress(item: BadgeCatalogItem) {
  const current = item.currentProgressValue ?? 0;
  const target = item.targetProgressValue ?? 0;

  if (item.isUnlocked || target <= 0) {
    return {
      ratio: 1,
      label: 'Đã đạt',
      remaining: 0,
    };
  }

  const ratio = Math.min(1, current / target);
  const remaining = Math.max(0, target - current);

  const unit = item.progressMetric
    ? PROGRESS_LABEL_VI[item.progressMetric]
    : '';

  return {
    ratio,
    label: unit ? `${Math.min(current, target)}/${target} ${unit}` : `${current}/${target}`,
    remaining,
  };
}
```

### 5.2 Trạng thái hiển thị

| Trạng thái | UI gợi ý |
|------------|----------|
| `isUnlocked === true` | Icon màu, không khóa; progress bar 100%; hiện `awardedAt` (format local) |
| `isUnlocked === false` && `current > 0` | Grayscale nhẹ + progress bar `{current}/{target}` |
| `isUnlocked === false` && `current === 0` | Grayscale + lock overlay; copy “Bắt đầu từ 0/{target}” |
| `isFeatured === true` | Viền / chip “Đang hiển thị” trên profile |

### 5.3 Nhóm section (grid Badges)

| Section | Codes |
|---------|-------|
| Cột mốc báo cáo | `first_report`, `eco_warrior`, `green_champion`, `earth_guardian` |
| Chuỗi ngày | `streak_7d`, `streak_30d` |
| Cộng đồng | `duplicate_finder`, `community_voice`, `cleanup_hero` |
| Theo điểm | `rising_star`, `eco_expert`, `green_legend` |

---

## 6. Endpoint liên quan

| Endpoint | Dùng khi |
|----------|----------|
| **`GET /v1/gamification/badges`** | **Màn Badges — catalog + progress (dùng endpoint này)** |
| `GET /v1/gamification/my-badges` | Chỉ badge đã nhận — **không có progress**. Không dùng làm màn chính Badges |
| `PUT /v1/gamification/featured-badge` | Chọn badge nổi bật profile `{ "badgeId": "uuid" \| null }` — chỉ badge đã unlock |
| `GET /v1/gamification/my-points` | Level / tổng điểm — bổ sung cho Hub, không thay badge catalog |

---

## 7. Khi nào refetch

| Sự kiện | Action |
|---------|--------|
| Mở màn Badges / Gamification Hub | `GET /badges` |
| Pull-to-refresh | Refetch |
| Notification `BadgeEarned` / `BadgeProgressNear` | Invalidate + refetch |
| Report status đổi (Verified / Duplicate / Resolved…) | Refetch badges + my-points |
| Hoàn thành check-in community cleanup | Refetch badges |
| Sau `PUT featured-badge` | Refetch badges (cập nhật `isFeatured`) |

---

## 8. Notification liên quan progress

| Type | Khi nào | Deep-link gợi ý |
|------|---------|------------------|
| `BadgeEarned` | Vừa unlock badge | `/(tabs)/gamification/badges` (có thể scroll/highlight badge qua `referenceId`) |
| `BadgeProgressNear` | Có **≥ 1** badge chưa đạt đang **gần unlock** (≥ 50% hoặc còn 1 bước) — gửi **tối đa 1 lần/user**; nội dung **chung**, không ghi tên badge hay `{current}/{target}` | `/(tabs)/gamification/badges` — màn catalog `GET /v1/gamification/badges` (không dùng `referenceId`) |

**Routing mobile:** `BadgeProgressNear` → luôn mở trang **tất cả huy hiệu**; user tự xem tiến độ từng badge trên catalog.

Template `badge_progress_near` (VI): *"Bạn đang rất gần với một danh hiệu mới. Mở mục Huy hiệu để xem tiến độ và tiếp tục cố gắng nhé!"* — không placeholder.

---

## 9. Icon URL

- Production: BE trả absolute URL (R2 public), ví dụ `https://pub-....r2.dev/badges/icons/{code}.png`.
- Fallback offline: bundle `assets/badges/{code}.png` (preview local BE: `docs/UserBadge/icons/`).

---

## 10. Pitfalls / FAQ

**Q: Progress có bị “lùi” không?**  
A: Có — vì tính real-time. Ví dụ báo cáo bị reject/soft-delete có thể làm `verified_reports` giảm. Badge **đã cấp** vẫn giữ trong `user_badges`.

**Q: `my-badges` vs `badges`?**  
A: Dùng **`badges`** cho UI progress. `my-badges` legacy / widget nhỏ nếu chỉ cần danh sách earned.

**Q: Streak tính theo múi giờ nào?**  
A: Ngày calendar **Việt Nam** (`Asia/Ho_Chi_Minh`), dựa trên `CreatedAt` của mọi báo cáo user gửi (mọi status).

**Q: `cleanup_hero` tính Leader không?**  
A: Không — chỉ role **Member** + check-in + event **Completed**.

**Q: `community_voice` là tổng confirmations hay max 1 report?**  
A: **Max** `reporter_count` trên một báo cáo bất kỳ của user (≥ 10).

---

## 11. Acceptance checklist (Mobile)

- [ ] Gọi `GET /v1/gamification/badges` — hiển thị đủ 12 badge
- [ ] Mỗi badge locked hiện progress bar từ `currentProgressValue` / `targetProgressValue`
- [ ] Label theo `progressMetric` (§3)
- [ ] Badge unlocked: 100%, hiện ngày nhận
- [ ] Chip / action featured badge (đã unlock)
- [ ] Không dùng catalog hardcode “coming soon” cho 12 badge trên
- [ ] Refetch theo §7
- [ ] Icon fallback khi `iconUrl` null

---

## 12. Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [`fe-mobile-gamification-full-guide.md`](./fe-mobile-gamification-full-guide.md) | Hub điểm / level / leaderboard (một số mục badge **đã lỗi thời** — ưu tiên doc này cho progress) |
| [`Gamification/gamification-module.md`](./Gamification/gamification-module.md) | Kiến trúc BE |
| [`UserBadge/badge_seed_proposal.md`](./UserBadge/badge_seed_proposal.md) | Thiết kế 12 badge gốc |
| `src/Greenlens.Application/Features/Gamification/BadgeEligibilityEvaluator.cs` | Logic map progress |
| `src/Greenlens.Api/Controllers/GamificationController.cs` | Routes |
