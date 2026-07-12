# Edit Profile API — Mobile (Flutter)

> Base URL: `{API_BASE}/v1/users`
> Auth: Bearer JWT (`Authorization: Bearer <access_token>`) — bắt buộc cho toàn bộ endpoint dưới đây.
> Tất cả response bọc trong envelope chung:
> ```json
> { "code": "SUCCESS", "message": "OK", "status": 200, "data": { ... } }
> ```
> Lỗi cũng theo envelope này (`data` có thể null), map theo `status` HTTP tương ứng.

Màn hình "Chỉnh sửa hồ sơ" cần gọi **3 API** riêng biệt: lấy hồ sơ hiện tại (prefill), cập nhật tên, và upload avatar. Đổi số điện thoại đi qua luồng OTP Firebase riêng, không nằm trong form edit-profile thông thường.

---

## 1. GET `/v1/users/profile` — Lấy hồ sơ hiện tại (prefill form)

**Request:** không có body/query param. Chỉ cần JWT.

**Response 200:**
```json
{
  "code": "SUCCESS",
  "message": "OK",
  "status": 200,
  "data": {
    "id": "guid",
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

**Lỗi:**
| HTTP | code | Khi nào |
|---|---|---|
| 401 | — | Token hết hạn/không hợp lệ |
| 404 | `USER_NOT_FOUND` | Không tìm thấy user (hiếm gặp) |

Dùng response này để prefill `fullName`, `phoneNumber` (readonly, hiển thị kèm badge "đã xác thực" nếu `isEmailVerified`/phone verified), `avatarUrl` cho ảnh đại diện hiện tại.

---

## 2. PUT `/v1/users/profile` — Cập nhật tên

**Chỉ hỗ trợ đổi `fullName`.** Không có field address/dateOfBirth/gender ở backend hiện tại — nếu FE có mock các field này thì cần bỏ khỏi form hoặc hỏi lại BE trước khi thiết kế UI.

**Request body:**
```json
{
  "fullName": "Nguyễn Văn B"
}
```
- `fullName`: string, optional (nullable), max length **200 ký tự**. Nếu không muốn đổi tên thì có thể gửi `null` hoặc bỏ field (server chỉ update field được truyền khác null).

**Response 200:**
```json
{
  "code": "SUCCESS",
  "message": "OK",
  "status": 200,
  "data": {
    "userId": "guid",
    "message": "Cập nhật hồ sơ thành công."
  }
}
```
(message thực tế trả về từ server bằng tiếng Việt, có thể khác nhẹ — không hardcode string này ở FE, chỉ dùng để hiển thị toast nếu muốn.)

**Lỗi:**
| HTTP | code | Khi nào |
|---|---|---|
| 401 | — | Token hết hạn |
| 404 | `USER_NOT_FOUND` | User không tồn tại |
| 422 | validation error | `fullName` vượt quá 200 ký tự |

---

## 3. POST `/v1/users/avatar` — Upload ảnh đại diện

**Request:** `multipart/form-data`, field name `file` chứa ảnh.

Giới hạn (validate cả 2 phía FE lẫn BE, FE nên chặn trước để đỡ tốn upload):
- Định dạng: `image/jpeg`, `image/png`, `image/webp` (theo content-type/magic bytes, không tin đuôi file)
- Kích thước tối đa: **5MB**

**Response 200:**
```json
{
  "code": "SUCCESS",
  "message": "OK",
  "status": 200,
  "data": {
    "avatarUrl": "https://cdn.example.com/avatars/xxx.jpg",
    "message": "Cập nhật ảnh đại diện thành công."
  }
}
```
Ảnh được upload thẳng lên Cloudflare R2, `avatarUrl` trả về là URL public vĩnh viễn (không phải presigned/tạm thời) — có thể lưu cache lại ngay và hiển thị luôn.

**Lỗi:**
| HTTP | code | Khi nào |
|---|---|---|
| 400 | `FILE_REQUIRED` | Không gửi file hoặc file rỗng |
| 401 | — | Token hết hạn |
| 404 | `USER_NOT_FOUND` | User không tồn tại |
| 422 | `INVALID_FILE_TYPE` | Sai định dạng (không phải jpg/png/webp) |
| 422 | `FILE_TOO_LARGE` | File > 5MB |
| 500 | `STORAGE_UPLOAD_FAILED` | Lỗi phía storage, nên cho retry |

---

## 4. (Ngoài phạm vi edit-profile) Đổi số điện thoại — POST `/v1/users/phone/verify-firebase`

Không nằm trong form "chỉnh sửa hồ sơ" thông thường vì cần xác thực OTP qua Firebase Phone Auth SDK ở FE trước.

**Flow:**
1. FE dùng Firebase SDK để gửi OTP tới số điện thoại mới, user nhập OTP → Firebase trả về `idToken`.
2. FE gọi:
```json
POST /v1/users/phone/verify-firebase
{ "firebaseIdToken": "<id_token_from_firebase>" }
```
3. Response 200:
```json
{
  "data": {
    "message": "...",
    "isPhoneVerified": true,
    "phoneNumber": "0912345678"
  }
}
```

**Lỗi:**
| HTTP | code | Khi nào |
|---|---|---|
| 401 | — | Token hết hạn |
| 409 | `PHONE_ALREADY_USED` | Số điện thoại đã gắn với tài khoản khác |
| 422 | `FIREBASE_TOKEN_INVALID` | Token Firebase sai/hết hạn |
| 422 | `FIREBASE_PHONE_MISSING` | Token hợp lệ nhưng không chứa số điện thoại |

Nếu màn hình edit-profile muốn cho user bấm "Đổi số điện thoại" ngay tại đó, nên điều hướng sang 1 flow/màn hình riêng (nhập số mới → verify OTP → gọi API này), không gộp chung với PUT `/profile`.

---

## Gợi ý implement UI (Flutter)

1. Gọi `GET /profile` khi vào màn hình → prefill `fullName`, hiển thị `avatarUrl` (CachedNetworkImage), hiển thị `phoneNumber` dạng readonly + nút "Đổi số điện thoại" riêng.
2. Nút đổi avatar: mở image picker → validate size/type client-side trước → gọi `POST /avatar` → cập nhật `avatarUrl` trong state ngay khi thành công.
3. Nút "Lưu": chỉ gọi `PUT /profile` với `fullName` mới nếu có thay đổi.
4. Email **không sửa được** ở màn này (không có field email trong command) — nếu cần đổi email phải hỏi lại BE, hiện chưa có API.

## Những gì backend CHƯA hỗ trợ (đã xác nhận với BE trước khi viết doc này)

- Không có field `address`, `dateOfBirth`, `gender` trên `User` entity — nếu sau này cần, phải làm thêm migration + mở rộng `UpdateUserProfileCommand` ở BE trước.
- Không thể đổi email qua API tự phục vụ.
