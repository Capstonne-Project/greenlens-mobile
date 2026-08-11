# Badge Seed Data — Đề xuất

> **Mục tiêu:** Xác định danh sách Badge phù hợp cho hệ thống GreenLens, loại bỏ badge CCCD.

---

## 1. Thay đổi: Loại bỏ "Verified Citizen (xác thực CCCD)"

### Lý do

- Hệ thống **không implement xác minh CCCD** → badge này không có trigger
- Profile User không có trường CCCD → không có cơ sở cấp badge

### Nơi cần cập nhật

| File                                                                                                                                     | Thay đổi                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [SU26SE049_BusinessRules_v1_2.md](file:///d:/LEARNING/S9SU26/SEP490/greenlens-service/docs/BusinessRule/SU26SE049_BusinessRules_v1_2.md) | BR-GAM-004: Bỏ 'Verified Citizen (xác thực CCCD)' |
| [OVERVIEW.md](file:///d:/LEARNING/S9SU26/SEP490/greenlens-service/OVERVIEW.md)                                                           | Bỏ mention CCCD ở PII nếu không liên quan         |

---

## 2. Danh sách Badge đề xuất (12 badges)

### Nguyên tắc thiết kế

- Badge phải **tự động cấp** được dựa trên dữ liệu hệ thống (không cần admin verify thủ công)
- Trigger = `RequiredReportCount` hoặc `RequiredPoints` hoặc logic đặc biệt trong handler
- Phân tầng từ dễ → khó để tạo động lực cho user

---

### Nhóm A — Milestone (Cột mốc số lượng báo cáo)

| #   | Code             | NameVi                | NameEn         | Điều kiện                          | Trigger                   |
| --- | ---------------- | --------------------- | -------------- | ---------------------------------- | ------------------------- |
| 1   | `first_report`   | Người Khởi Đầu        | First Reporter | Gửi báo cáo đầu tiên được Verified | RequiredReportCount = 1   |
| 2   | `eco_warrior`    | Chiến Binh Xanh       | Eco Warrior    | 10 báo cáo được Verified           | RequiredReportCount = 10  |
| 3   | `green_champion` | Nhà Vô Địch Xanh      | Green Champion | 50 báo cáo được Verified           | RequiredReportCount = 50  |
| 4   | `earth_guardian` | Người Bảo Vệ Trái Đất | Earth Guardian | 100 báo cáo được Verified          | RequiredReportCount = 100 |

> **Giải thích:** Đây là nhóm badge cốt lõi, khuyến khích user gửi báo cáo liên tục. Mốc 1 → 10 → 50 → 100 tạo progression rõ ràng.

---

### Nhóm B — Streak (Tính liên tục)

| #   | Code         | NameVi           | NameEn        | Điều kiện                     | Trigger        |
| --- | ------------ | ---------------- | ------------- | ----------------------------- | -------------- |
| 5   | `streak_7d`  | Bền Bỉ 7 Ngày    | 7-Day Streak  | Gửi báo cáo 7 ngày liên tiếp  | Logic đặc biệt |
| 6   | `streak_30d` | Kiên Trì 30 Ngày | 30-Day Streak | Gửi báo cáo 30 ngày liên tiếp | Logic đặc biệt |

> **Giải thích:** Streak badge khuyến khích thói quen báo cáo hàng ngày. Cần background job kiểm tra streak count.

---

### Nhóm C — Community (Cộng đồng & Hành động đặc biệt)

| #   | Code               | NameVi                | NameEn           | Điều kiện                                                          | Trigger        |
| --- | ------------------ | --------------------- | ---------------- | ------------------------------------------------------------------ | -------------- |
| 7   | `hotspot_hunter`   | Thợ Săn Điểm Nóng     | Hotspot Hunter   | 3 báo cáo nằm trong khu vực hotspot (≥10 reports/500m/30d)         | Logic đặc biệt |
| 8   | `duplicate_finder` | Người Phát Hiện Trùng | Duplicate Finder | 5 báo cáo được xác nhận là duplicate (hỗ trợ phát hiện trùng)      | Logic đặc biệt |
| 9   | `community_voice`  | Tiếng Nói Cộng Đồng   | Community Voice  | Có báo cáo nhận ≥ 10 lượt ReporterCount (nhiều người cùng báo cáo) | Logic đặc biệt |

> **Giải thích:**
>
> - **Hotspot Hunter**: phát hiện ô nhiễm ở vùng tập trung cao → hỗ trợ LEO ưu tiên xử lý.
> - **Duplicate Finder**: gửi báo cáo trùng nhưng vẫn hữu ích (tăng ReporterCount) → nhận 50% điểm (BR-REP-032).
> - **Community Voice**: thay thế 'Verified Citizen' — đo lường đóng góp thực sự cho cộng đồng.

---

### Nhóm D — Level (Điểm tích lũy)

| #   | Code           | NameVi                | NameEn       | Điều kiện                  | Trigger               |
| --- | -------------- | --------------------- | ------------ | -------------------------- | --------------------- |
| 10  | `rising_star`  | Ngôi Sao Đang Lên     | Rising Star  | Đạt Level 2 (≥ 100 điểm)   | RequiredPoints = 100  |
| 11  | `eco_expert`   | Chuyên Gia Môi Trường | Eco Expert   | Đạt Level 4 (≥ 1,500 điểm) | RequiredPoints = 1500 |
| 12  | `green_legend` | Huyền Thoại Xanh      | Green Legend | Đạt Level 5 (≥ 5,000 điểm) | RequiredPoints = 5000 |

> **Giải thích:** Liên kết trực tiếp với Level System (BR-GAM-003). Khi user lên level → auto-award badge tương ứng.

---

## 3. Bảng tổng hợp

| #   | Code               | Nhóm      | RequiredPoints | RequiredReportCount | Auto-trigger |
| --- | ------------------ | --------- | :------------: | :-----------------: | :----------: |
| 1   | `first_report`     | Milestone |       —        |          1          |      ✅      |
| 2   | `eco_warrior`      | Milestone |       —        |         10          |      ✅      |
| 3   | `green_champion`   | Milestone |       —        |         50          |      ✅      |
| 4   | `earth_guardian`   | Milestone |       —        |         100         |      ✅      |
| 5   | `streak_7d`        | Streak    |       —        |          —          |  🔧 Handler  |
| 6   | `streak_30d`       | Streak    |       —        |          —          |  🔧 Handler  |
| 7   | `hotspot_hunter`   | Community |       —        |          —          |  🔧 Handler  |
| 8   | `duplicate_finder` | Community |       —        |          —          |  🔧 Handler  |
| 9   | `community_voice`  | Community |       —        |          —          |  🔧 Handler  |
| 10  | `rising_star`      | Level     |      100       |          —          |      ✅      |
| 11  | `eco_expert`       | Level     |      1500      |          —          |      ✅      |
| 12  | `green_legend`     | Level     |      5000      |          —          |      ✅      |

> - **✅ Auto-trigger**: tự động cấp qua `UserPoints.AwardPoints()` hoặc `AwardBadgeHandler` khi đạt mốc
> - **🔧 Handler**: cần logic riêng trong handler/job để kiểm tra điều kiện

---

## 4. Cập nhật BR-GAM-004

**Trước (v1.2):**

> 'First Report', 'Eco Warrior (10 reports)', 'Hotspot Hunter (3 reports trong hotspot)', **'Verified Citizen (xác thực CCCD)'**, 'Streak (7 ngày liên tiếp)'. Admin thêm badge (BR-ADM-005).

**Sau:**

> 12 huy hiệu mặc định chia 4 nhóm: **Milestone** (First Reporter / Eco Warrior / Green Champion / Earth Guardian), **Streak** (7-Day / 30-Day), **Community** (Hotspot Hunter / Duplicate Finder / Community Voice), **Level** (Rising Star / Eco Expert / Green Legend). ~~Bỏ 'Verified Citizen (xác thực CCCD)' do không implement xác minh CCCD.~~ Admin thêm badge tùy chỉnh (BR-ADM-005).

---

## 5. Việc cần làm sau khi approve

1. ✏️ Sửa **BR-GAM-004** trong `SU26SE049_BusinessRules_v1_2.md`
2. ✏️ Bỏ CCCD mention ở PII nếu cần (OVERVIEW.md, AGENTS.md)
3. 🆕 Tạo **Badge seed migration** (`SeedBadgeData`)
4. 🆕 Cập nhật **Badge.cs** XML comment liệt kê 12 badges mới

> [!IMPORTANT]
> Approve danh sách 12 badge trên trước khi tôi tiến hành implement.
> Nếu muốn thêm/bớt/đổi tên badge nào, hãy cho biết.
