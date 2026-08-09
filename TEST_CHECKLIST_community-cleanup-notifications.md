# Checklist test — Community Cleanup + Notifications

Ngày làm: xem git log. Test trên: App (citizen + Leader/Cleaner), Web LEO (`greenlens-portal`).

Cần BE (`greenlens-service`) đang chạy với migration/seed mới nhất (notification templates + badge mới sẽ tự seed khi khởi động).

---

## 1. Leader check-in → LEO nhận thông báo

- [ ] Cleaner (Leader) check-in tại điểm hẹn của 1 chương trình dọn cộng đồng.
- [ ] LEO (web) nhận notification "Chương trình dọn cộng đồng đã bắt đầu" — bấm vào mở đúng `/officer/community?eventId=...`.
- [ ] **Citizen tham gia (mobile) KHÔNG nhận noti này** (đã chủ động bỏ theo yêu cầu mới nhất — chỉ LEO nhận).

## 2. Bỏ validate giờ bắt đầu + reminder check-in

- [ ] Leader có thể bấm "Bắt đầu nhiệm vụ" **trước** giờ `StartsAt` mà không bị chặn lỗi "chưa đến giờ".
- [ ] Tạo 1 chương trình test có `StartsAt` trong ~12–14 phút tới → đợi job chạy (job quét mỗi 5 phút, cửa sổ 10–15 phút trước giờ) → citizen đã join (chưa check-in) nhận noti "Sắp đến giờ dọn dẹp — đừng quên check-in".
- [ ] Check-in rồi thì **không** nhận lại reminder cho event đó nữa (kiểm tra dedup không gửi trùng).
- [ ] Leader cũng nằm trong participants nên cũng phải nhận được reminder này.

## 3. Tab "Tất cả chương trình" / "Tôi tham gia" ở màn `/community`

- [ ] Vào mục "Chương trình dọn cộng đồng" từ tab Báo cáo → thấy 2 tab con: **Tất cả chương trình** và **Tôi tham gia**.
- [ ] Tab "Tôi tham gia" hiện đúng các chương trình mình đã join, có badge trạng thái (Đã tham gia / Đã check-in / Đã rút / Vắng mặt).
- [ ] Card nào sắp đến giờ (≤30 phút) mà mình chưa check-in → hiện banner vàng nhắc check-in ngay trên card.
- [ ] Tab "Tôi tham gia" có badge đỏ đếm số chương trình cần check-in gấp.

## 4. Timeline thông báo cho LEO (web)

Với 1 chương trình do LEO mở, Cleaner (Leader) thao tác lần lượt — sau mỗi bước kiểm tra LEO có nhận noti đúng loại + đúng nội dung:

- [ ] Leader check-in / bấm Start → LEO nhận **"Chương trình đã bắt đầu"**.
- [ ] Leader cập nhật % tiến độ (vd 40%, 70%) → LEO nhận **"Cập nhật tiến độ dọn dẹp — X%"** mỗi lần.
- [ ] Leader nộp minh chứng hoàn thành (submit verification) → LEO nhận **"Cần duyệt hoàn thành chương trình"**.
- [ ] LEO từ chối minh chứng (kèm lý do) → Leader (mobile, vào `/community-lead/[id]`) nhận **"Minh chứng bị từ chối"** kèm lý do.
- [ ] LEO duyệt hoàn thành (Approve) → **cả participants (citizen) lẫn LEO** đều nhận **"Chương trình đã hoàn thành"**.

## 5. Badge "Anh Hùng Dọn Dẹp" (cleanup_hero) — cần 2 lần hoàn thành

- [ ] Một citizen tham gia + check-in + hoàn thành **1** chương trình dọn cộng đồng → **chưa** nhận badge, nhưng nhận noti **"Sắp đạt huy hiệu mới — 1/2"**.
- [ ] Cùng citizen đó tham gia + hoàn thành chương trình **thứ 2** → nhận badge "Anh Hùng Dọn Dẹp" kèm noti `BadgeEarned`.
- [ ] Noti "1/2" chỉ gửi **đúng 1 lần** cho mỗi user (không lặp lại khi CheckBadges chạy lại nhiều lần trước khi đạt badge thật).
- [ ] Vào trang Huy Hiệu kiểm tra badge cleanup_hero hiển thị đúng progress 1/2 → 2/2 và mở khóa.

## 6. Web — hiển thị notification mới

- [ ] Trang cài đặt notification preferences (LEO) hiện đủ label + icon cho các loại mới (không bị icon chuông mặc định / label thô kiểu `CommunityCleanupStarted`).
- [ ] Dropdown/inbox notification trên web không bị vỡ layout với notification loại mới (không crash, không hiện "undefined").

## 7. Mobile — hiển thị notification mới

- [ ] Trong danh sách Thông báo (mobile), noti `CommunityCleanupCheckInReminder` / `CommunityCleanupVerified` / `BadgeProgressNear` hiện icon + nhãn phù hợp (không rơi vào icon chuông mặc định "Hệ thống").
- [ ] Bấm vào từng loại điều hướng đúng: CheckInReminder/Verified → `/community/[id]`; BadgeProgressNear → tab Hồ sơ.

---

### Lưu ý khi test
- Một số luồng cần chờ Hangfire job (`community-cleanup-checkin-reminder` chạy mỗi 5 phút) — có thể trigger thủ công qua Hangfire Dashboard nếu cần test nhanh thay vì chờ.
- Nếu không thấy label/icon đúng ở web hay app, thử clear cache / hot-reload lại vì notification template mới chỉ seed khi BE khởi động lần đầu sau khi đổi code.
