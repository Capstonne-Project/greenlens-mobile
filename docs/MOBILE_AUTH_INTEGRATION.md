# GreenLens — Hướng dẫn tích hợp Authentication cho Mobile

> **Mục đích:** Tài liệu cho team mobile triển khai luồng đăng ký, đăng nhập, OTP, đổi mật khẩu, refresh token và đăng nhập Google đối với API GreenLens (SU26SE049).
>
> **Chuẩn API:** `00_API_CONVENTIONS.md` — mọi response đều bọc trong envelope `{ code, message, status, data }`.
>
> **Backend hiện tại:** Controller `AuthController` route prefix `v1/auth` (xem `src/Greenlens.Api/Controllers/AuthController.cs`).

---

## 1. Base URL theo môi trường

| Môi trường | Base URL |
|------------|----------|
| Local | `http://localhost:5000/v1` |
| Dev | `https://api-dev.greenlens.com.vn/v1` |
| Staging | `https://api-stg.greenlens.com.vn/v1` |
| Production | `https://api.greenlens.com.vn/v1` |

**Auth paths:** cộng thêm `/auth/...` sau base URL.  
Ví dụ đăng nhập: `POST {baseUrl}/auth/login`.

---

## 2. Envelope response (bắt buộc parse)

Mọi response thành công và lỗi đều có dạng:

```json
{
  "code": "SUCCESS",
  "message": "Human readable",
  "status": 200,
  "data": { }
}
```

| Field | Ý nghĩa |
|-------|---------|
| `code` | Mã nghiệp vụ `UPPER_SNAKE_CASE` (vd: `SUCCESS`, `INVALID_CREDENTIALS`) |
| `message` | Thông báo (i18n theo `Accept-Language`) |
| `status` | HTTP status trùng với status line |
| `data` | Payload; có thể `null` khi lỗi |

**Mobile nên:** luôn đọc `code` + `status`; không chỉ dựa vào HTTP status.

### Lỗi validation (422)

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "status": 422,
  "data": {
    "errors": [
      { "field": "email", "code": "INVALID_FORMAT", "message": "..." }
    ]
  }
}
```

---

## 3. Headers chuẩn

```http
Content-Type: application/json
Accept-Language: vi-VN
```

Hoặc tiếng Anh: `Accept-Language: en-US`.

**Request có đăng nhập:**

```http
Authorization: Bearer {accessToken}
```

**Tùy chọn:**

```http
X-Request-ID: {uuid-v4}
```

Server có thể tự sinh nếu client không gửi.

---

## 4. Vòng đời token (BR-AUTH-013)

| | Access Token | Refresh Token |
|---|--------------|---------------|
| **Thời gian sống** | 24 giờ | 30 ngày |
| **Lưu trữ gợi ý (mobile)** | Bộ nhớ trong phiên (RAM) hoặc secure storage ngắn hạn | **Secure storage** (Keychain / EncryptedSharedPreferences / Keystore) |
| **Luân chuyển** | Gửi mỗi request API cần auth | **Rotation:** mỗi lần refresh thành công nhận **cặp token mới** — luôn ghi đè refresh token cũ |

**Quy tắc cho app:**

1. Giữ `accessToken` trong memory khi có thể; khi app khởi động lại, đọc `refreshToken` từ secure storage và gọi `POST /auth/refresh-token` để lấy cặp mới.
2. Khi nhận `401` hoặc `code` liên quan token hết hạn (`TOKEN_EXPIRED`), thử refresh một lần; nếu refresh thất bại → đăng xuất local và đưa user về màn hình login.
3. **Không** log hoặc hiển thị full JWT trong UI/debug build gửi ra ngoài.

**Theo spec dự án (web):** không hoạt động > 30 phút có thể yêu cầu đăng nhập lại (timer phía client + server có thể từ chối refresh trong một số kịch bản). Mobile nên thống nhất với PO: có thể dùng timer tương tự hoặc chỉ dựa vào hết hạn token.

---

## 5. JWT access token — payload tham khảo

Server ký JWT; client **decode payload** (không verify chữ ký trên mobile trừ khi dùng thư viện + public key — thông thường chỉ đọc claim để hiển thị).

Cấu trúc tham khảo (theo `00_API_CONVENTIONS.md`):

```json
{
  "sub": "user-uuid",
  "email": "a@b.com",
  "role": "Citizen",
  "permissions": ["report:create", "report:read"],
  "iat": 1715234567,
  "exp": 1715320967,
  "jti": "token-uuid"
}
```

**Role** (chuỗi, khớp backend): `Citizen`, `Officer`, `CleanupTeam`, `Admin` — dùng cho UI/phân quyền màn hình (server vẫn là nguồn sự thật qua policy).

---

## 6. Endpoint Auth — tóm tắt

Prefix: **`POST/GET base + /auth/...`** (với base = `/v1`).

| Method | Path | Auth | Mô tả ngắn |
|--------|------|------|------------|
| POST | `/auth/register` | Anonymous | Đăng ký, gửi OTP xác email |
| POST | `/auth/login` | Anonymous | Email + password → tokens |
| POST | `/auth/request-otp` | Anonymous | Gửi OTP 6 số (email) |
| POST | `/auth/verify-otp` | Anonymous | Xác thực OTP |
| POST | `/auth/forgot-password` | Anonymous | Gửi OTP reset (không lộ email có tồn tại hay không) |
| POST | `/auth/reset-password` | Anonymous | Đặt lại mật khẩu bằng OTP; **thu hồi mọi refresh token** |
| POST | `/auth/change-password` | **Bearer** | Đổi mật khẩu khi đã đăng nhập |
| POST | `/auth/refresh-token` | Anonymous | Body gửi refresh token → cặp token mới (rotation) |
| POST | `/auth/google-login` | Anonymous | Đăng nhập bằng Google (Firebase ID token) |

Chi tiết body/response từng API ở các mục dưới.

---

## 7. Đăng ký — `POST /auth/register`

**Body (JSON, camelCase):**

```json
{
  "email": "user@example.com",
  "password": "Str0ng!Pass",
  "fullName": "Nguyen Van A"
}
```

**Quy tắc mật khẩu (BR-AUTH-005, khớp validator):**

- Tối thiểu 8 ký tự  
- Có chữ hoa, chữ thường, chữ số, ký tự đặc biệt  

**Response `data` (RegisterResponse):**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "message": "..."
}
```

**Lỗi thường gặp:** `EMAIL_TAKEN` (409), `VALIDATION_ERROR` / `WEAK_PASSWORD` (422).

**Luồng mobile gợi ý:** Sau register → màn hình nhập OTP → gọi `verify-otp` với `purpose: "EmailVerification"` (xem mục OTP).

---

## 8. Đăng nhập — `POST /auth/login`

**Body:**

```json
{
  "email": "user@example.com",
  "password": "Str0ng!Pass"
}
```

**Response `data` (LoginResponse):**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "role": "Citizen",
    "isEmailVerified": true
  }
}
```

**Lưu:** `refreshToken` vào secure storage; `accessToken` dùng cho header Bearer.

**Mã lỗi nghiệp vụ (trong `code`):**

| `code` | Ý nghĩa |
|--------|---------|
| `INVALID_CREDENTIALS` | Sai email/mật khẩu |
| `ACCOUNT_LOCKED` | Khóa sau nhiều lần đăng nhập sai (BR-AUTH-011: 5 lần / 15 phút → khóa 30 phút) |
| `EMAIL_NOT_VERIFIED` | Chưa xác thực email — điều hướng sang luồng OTP |

**Rate limit đăng nhập:** theo spec dự án, failed login có giới hạn; hiển thị thông báo từ `message` và có thể bật CAPTCHA từ lần thử thứ 3 (BR-AUTH-011 — tùy backend/mobile triển khai).

---

## 9. Refresh token — `POST /auth/refresh-token`

**Body:**

```json
{
  "refreshToken": "<refresh_token_from_secure_storage>"
}
```

**Response `data`:** cùng shape **LoginResponse** (access + refresh mới + user).

**Quan trọng:** Luôn **thay thế** refresh token cũ bằng token mới trong response (rotation). Token cũ sau rotation không còn hiệu lực.

**Lỗi:** `INVALID_REFRESH_TOKEN`, `TOKEN_EXPIRED` — xóa session local, yêu cầu đăng nhập lại.

---

## 10. OTP — purpose enum

API dùng `System.Text.Json` với `JsonStringEnumConverter`. Enum trong code là `OtpPurpose`:

- `EmailVerification`
- `PasswordReset`

**Gửi trong JSON body** (field `purpose`) dạng **chuỗi** như tên enum trên (PascalCase). Nếu lỗi parse, kiểm tra Swagger/OpenAPI thực tế của môi trường deploy.

### 10.1 Gửi OTP — `POST /auth/request-otp`

**Body:**

```json
{
  "email": "user@example.com",
  "purpose": "EmailVerification"
}
```

hoặc `"PasswordReset"` sau bước forgot-password.

**Response `data`:** có field `message` (RequestOtpResponse).

**Thời gian sống OTP (theo convention):** email **10 phút** (server lưu Redis — client chỉ cần hiển thị countdown gợi ý).

### 10.2 Xác thực OTP — `POST /auth/verify-otp`

**Body:**

```json
{
  "email": "user@example.com",
  "otpCode": "123456",
  "purpose": "EmailVerification"
}
```

**Response `data`:** `message`, `isVerified` (VerifyOtpResponse).

**Lỗi:** `OTP_INVALID`, `OTP_EXPIRED`, `OTP_MAX_ATTEMPTS`.

---

## 11. Quên mật khẩu — `POST /auth/forgot-password`

**Body:**

```json
{
  "email": "user@example.com"
}
```

**Hành vi:** Luôn trả success về mặt messaging để **không lộ** email có trong hệ thống hay không (anti-enumeration). Mobile: hiển thị một thông báo trung tính (“Nếu email tồn tại, bạn sẽ nhận mã…”).

**Response `data`:** `message` (ForgotPasswordResponse).

---

## 12. Đặt lại mật khẩu — `POST /auth/reset-password`

**Body:**

```json
{
  "email": "user@example.com",
  "otpCode": "123456",
  "newPassword": "NewStr0ng!Pass"
}
```

**Mật khẩu mới:** cùng quy tắc độ mạnh như đăng ký.

**Quan trọng:** Sau reset thành công, **mọi refresh token cũ bị thu hồi** — app phải xóa token local và yêu cầu đăng nhập lại (hoặc nếu API trả token mới trong tương lai, làm theo spec — hiện tại chỉ cần biết session cũ không còn hiệu lực).

**Lỗi:** `OTP_INVALID`, `OTP_EXPIRED`, `NOT_FOUND`, `WEAK_PASSWORD`.

---

## 13. Đổi mật khẩu (đã đăng nhập) — `POST /auth/change-password`

**Header:** `Authorization: Bearer {accessToken}`

**Body:**

```json
{
  "currentPassword": "OldStr0ng!Pass",
  "newPassword": "NewStr0ng!Pass"
}
```

**Lỗi:** `401`, `INCORRECT_CURRENT_PASSWORD`, `WEAK_PASSWORD`.

---

## 14. Google Login — `POST /auth/google-login`

**Body:**

```json
{
  "idToken": "<Firebase_Google_ID_token>"
}
```

**Response `data`:** **LoginResponse** (giống login email/password).

**Lỗi:** `GOOGLE_AUTH_FAILED`.

Mobile cần tích hợp Firebase (hoặc flow Google Sign-In) để lấy **ID token** đúng format mà backend xác minh.

---

## 15. Rate limit & headers

Mọi response có thể kèm:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1715234600
Retry-After: 30
```

(`Retry-After` chủ yếu khi **429**.)

Theo `00_API_CONVENTIONS.md`:

- API công khai ẩn danh: **60 request/phút/IP**
- User đã auth: **300 request/phút/user**

App nên backoff khi nhận **429** và đọc `Retry-After` nếu có.

---

## 16. Checklist tích hợp nhanh cho mobile

- [ ] Parse envelope `code` / `status` / `data` cho mọi API.
- [ ] Lưu `refreshToken` an toàn; rotate sau mỗi lần refresh.
- [ ] Gắn `Authorization: Bearer` cho các API cần đăng nhập.
- [ ] Gửi `Accept-Language` theo locale app.
- [ ] Xử lý `ACCOUNT_LOCKED`, `EMAIL_NOT_VERIFIED`, OTP errors với message từ server.
- [ ] Sau `reset-password`, clear toàn bộ token và đưa về login.
- [ ] Không hardcode secret; không commit token vào repo.
- [ ] Kiểm tra lại **Swagger** (`/swagger` trên môi trường dev) để schema cuối cùng khi backend cập nhật.

---

## 17. Tham chiếu mã nguồn backend

| Nội dung | File |
|----------|------|
| Routes & Swagger | `src/Greenlens.Api/Controllers/AuthController.cs` |
| Login / Refresh response | `LoginResponse.cs`, `UserDto` |
| Register | `RegisterCommand.cs`, `RegisterResponse.cs` |
| Lỗi auth | `src/Greenlens.Application/Common/Errors.cs` → `Errors.Auth` |
| Convention API | `00_API_CONVENTIONS.md` |

---

**Phiên bản tài liệu:** 1.0 — đồng bộ với convention dự án và code hiện có; khi API thay đổi, cập nhật bảng endpoint và ví dụ JSON theo Swagger.
