# Thông báo mới: "LEO mời tham gia đội" (Staff Invitation)

> Gửi cho team Mobile để implement UI/UX xử lý loại thông báo mới khi LEO (Local Environmental Officer) mời Citizen tham gia đội Cleaner/Inspector.

---

## 1. Bối cảnh

LEO có thể mời một Citizen tham gia đội (Cleanup hoặc Inspection) tại phường/xã của họ. Khi đó backend tạo ra một `StaffInvitation` (hết hạn sau 7 ngày, dùng 1 lần) và gửi thông báo cho Citizen được mời. Citizen cần thấy thông báo này và có hành động **Chấp nhận** / **Từ chối** ngay trong app.

## 2. Loại thông báo liên quan (`NotificationType`)

| Type (enum) | Khi nào bắn ra | Người nhận |
|---|---|---|
| `StaffInvitationReceived` | LEO gửi lời mời | Citizen được mời |
| `StaffInvitationAccepted` | Citizen chấp nhận lời mời | LEO đã mời |
| `StaffInvitationDeclined` | Citizen từ chối lời mời | LEO đã mời |

Mobile cần xử lý **cả 3 loại** trong danh sách thông báo, nhưng loại quan trọng nhất cần có action button là `StaffInvitationReceived`.

## 3. Nội dung mẫu (template)

| Type | Tiêu đề (vi) | Nội dung (vi) |
|---|---|---|
| `StaffInvitationReceived` | Lời mời tham gia đội môi trường | `{inviter_name}` đã mời bạn tham gia vai trò `{target_role}` tại `{office_name}`{team_clause}. Vui lòng xem và phản hồi trong 7 ngày. |
| `StaffInvitationAccepted` | Thành viên đã chấp nhận lời mời | `{member_name}` đã chấp nhận lời mời tham gia vai trò `{target_role}` tại `{office_name}`{team_clause}. |
| `StaffInvitationDeclined` | Thành viên đã từ chối lời mời | `{member_name}` đã từ chối lời mời tham gia vai trò `{target_role}` tại `{office_name}`. |

`{target_role}` = `Cleaner` hoặc `Inspector`. `{team_clause}` có thể rỗng (nếu LEO chưa gán team cụ thể) hoặc dạng `, đội {team_name}`.

## 4. API — Danh sách thông báo

`GET /v1/notifications/my` (hiện có, không đổi shape) trả về từng item:

```json
{
  "id": "guid",
  "type": "StaffInvitationReceived",
  "title": "Lời mời tham gia đội môi trường",
  "message": "An (LEO) đã mời bạn tham gia vai trò Cleaner tại Phường Bến Nghé, đội Vệ sinh 1. Vui lòng xem và phản hồi trong 7 ngày.",
  "referenceId": "guid  <-- chính là invitationId",
  "isRead": false,
  "readAt": null,
  "createdAt": "2026-07-28T02:00:00Z"
}
```

> **Quan trọng cho Mobile:** khi `type == "StaffInvitationReceived"`, field `referenceId` là **`invitationId`** — dùng field này để gọi accept/decline bên dưới, KHÔNG dùng `id` của notification.

## 5. API — Hành động Accept / Decline

Base route: `v1/invitations` (đã tồn tại, Citizen role, cần Bearer token).

| Hành động | Method | Endpoint | Body | Response |
|---|---|---|---|---|
| Xem chi tiết lời mời của tôi | GET | `/v1/invitations/my` | — | `List<InvitationDto>` |
| Chấp nhận | POST | `/v1/invitations/{invitationId}/accept` | — | `200 OK` + `AcceptInvitationResponse` |
| Từ chối | POST | `/v1/invitations/{invitationId}/decline` | — | `204 No Content` |

`InvitationDto`:
```json
{
  "invitationId": "guid",
  "invitedByUserId": "guid",
  "invitedByName": "An (LEO)",
  "targetRole": "Cleaner",
  "officeName": "Phường Bến Nghé",
  "teamName": "Đội Vệ sinh 1",
  "status": "Pending",   // Pending | Accepted | Declined | Expired
  "expiresAt": "2026-08-04T02:00:00Z",
  "createdAt": "2026-07-28T02:00:00Z"
}
```

Lỗi cần bắt trên mobile:
- `404` — lời mời không tồn tại (đã bị xoá/không thuộc user hiện tại).
- `422` — lời mời hết hạn (`expiresAt` đã qua) hoặc đã được dùng (status khác `Pending`) → hiển thị thông báo "Lời mời đã hết hạn hoặc đã được xử lý" và ẩn nút hành động.

## 6. UX đề xuất cho Mobile

1. Trong danh sách thông báo, item có `type == "StaffInvitationReceived"` và `isRead == false`/`status == Pending` hiển thị 2 nút **Chấp nhận** / **Từ chối** ngay trên card (giống pattern lời mời kết bạn).
2. Khi bấm **Chấp nhận** → gọi `POST /v1/invitations/{referenceId}/accept` → nếu 200, cập nhật UI: đổi role hiển thị của user thành Cleaner/Inspector, toast "Bạn đã tham gia đội {teamName}".
3. Khi bấm **Từ chối** → gọi `POST /v1/invitations/{referenceId}/decline` → nếu 204, ẩn nút hành động, đổi trạng thái card thành "Đã từ chối".
4. Nếu lời mời đã quá 7 ngày (so `expiresAt` với thời gian hiện tại) hoặc BE trả 422, ẩn nút hành động và hiển thị badge "Hết hạn".
5. Sau khi accept thành công, refresh lại profile/role của user (role đổi từ Citizen → Cleaner/Inspector), vì một số màn hình (home tab, permissions) phụ thuộc vào role.

## 7. Việc BE đã có sẵn (không cần chờ)

- Enum `NotificationType.StaffInvitationReceived/Accepted/Declined` — đã tồn tại.
- Template thông báo (vi/en) — đã seed sẵn (`NotificationTemplateSeeder`).
- Endpoint accept/decline — đã có, không cần BE đổi gì thêm cho tính năng này.

Nếu Mobile cần thêm field nào (vd. avatar LEO, icon riêng cho loại invitation) trong response, báo lại để bổ sung.
