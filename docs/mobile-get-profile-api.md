# Get Profile API — Mobile (Flutter)

> Dùng cho màn hình **"Xem hồ sơ"** (hiển thị thông tin tài khoản). Nếu cần API cho màn **"Chỉnh sửa hồ sơ"** xem file [`mobile-edit-profile-api.md`](./mobile-edit-profile-api.md).

## GET `/v1/users/profile`

**Base URL:** `{API_BASE}/v1/users/profile`
**Auth:** Bearer JWT bắt buộc (`Authorization: Bearer <access_token>`) — không cần truyền `userId`, BE tự lấy từ token.
**Request:** không có body, không có query param.

### Response 200

```json
{
  "code": "SUCCESS",
  "message": "OK",
  "status": 200,
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "user@example.com",
    "fullName": "Nguyễn Văn A",
    "phoneNumber": "0912345678",
    "avatarUrl": "https://cdn.example.com/avatars/xxx.jpg",
    "role": "Citizen",
    "isEmailVerified": true,
    "googleId": null,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-06-01T00:00:00Z"
  }
}
```

### Field reference (`data`)

| Field | Type | Nullable | Ghi chú |
|---|---|---|---|
| `id` | string (Guid) | không | ID tài khoản |
| `email` | string | không | Email đăng nhập, **không sửa được** qua API tự phục vụ hiện tại |
| `fullName` | string | không | Tên hiển thị |
| `phoneNumber` | string | **có** | `null` nếu chưa xác thực số điện thoại |
| `avatarUrl` | string | **có** | `null` nếu chưa từng upload avatar → FE hiển thị avatar mặc định |
| `role` | string (enum) | không | `Citizen` \| `Officer` \| `CleanupTeam` \| `Admin` (tuỳ hệ thống role hiện có) |
| `isEmailVerified` | bool | không | Hiển thị badge "đã xác thực" nếu `true` |
| `googleId` | string | **có** | Khác `null` nếu tài khoản đăng nhập qua Google — FE có thể dùng để ẩn ô đổi mật khẩu (tài khoản Google không có password nội bộ) |
| `createdAt` | string (ISO datetime, UTC) | không | Ngày tạo tài khoản — có thể hiển thị "Tham gia từ..." |
| `updatedAt` | string (ISO datetime, UTC) | **có** | Lần cập nhật hồ sơ gần nhất |

### Lỗi

| HTTP | code | Khi nào | Gợi ý xử lý FE |
|---|---|---|---|
| 401 | — | Access token hết hạn/invalid | Điều hướng về màn login hoặc thử refresh token |
| 404 | `USER_NOT_FOUND` | Tài khoản không tồn tại (hiếm, có thể do bị xoá) | Logout, xoá session local |

### Gợi ý dùng ở FE

- Gọi API này khi vào màn "Hồ sơ" / sau khi login thành công để cache thông tin user vào state management (Bloc/Riverpod/Provider...).
- `phoneNumber == null` → hiển thị nút "Thêm số điện thoại" thay vì hiển thị số.
- `avatarUrl == null` → dùng placeholder/avatar chữ cái đầu tên.
- Không có field `address`, `dateOfBirth`, `gender` — nếu UI thiết kế sẵn các field này thì cần bỏ hoặc xác nhận lại với BE trước (hiện chưa tồn tại trong dữ liệu user).
