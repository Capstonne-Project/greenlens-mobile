# API: Accept Assignment (Cleanup / Inspector Team Leader)

## Endpoint

```
PUT /v1/reports/{id}/accept
```

## Mô tả

Team leader chấp nhận task được phân công cho team của mình.  
Backend tự xác định team từ JWT token — **không cần truyền `teamId` trong body**.

## Yêu cầu

- **Roles được phép:** `Cleanup`, `Inspector`, `Admin`
- **Điều kiện bắt buộc:** user đang đăng nhập **phải là leader** của team được gán vào report đó.  
  Nếu user là member thường (không phải leader) → trả về lỗi `NOT_TEAM_LEADER`.

## Request

### Headers

| Header | Giá trị |
|---|---|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | *(không cần, không có body)* |

### Path Parameters

| Param | Type | Mô tả |
|---|---|---|
| `id` | `uuid` | ID của report cần accept |

### Body

**Không có body.**

## Response

### Thành công — `204 No Content`

Không có response body.

### Lỗi

| HTTP | Error Code | Mô tả |
|---|---|---|
| `401` | — | Chưa đăng nhập / token hết hạn |
| `403` | — | Role không được phép |
| `422` | `NOT_TEAM_LEADER` | User đang đăng nhập không phải leader của team nào |
| `422` | `REPORT_NOT_FOUND` | Không tìm thấy report với ID đã cho |
| `422` | `INVALID_STATUS_TRANSITION` | Report không đang ở trạng thái `Assigned` |
| `422` | `ASSIGNMENT_NOT_FOUND` | Team của leader không được gán vào report này |

### Cấu trúc lỗi (RFC 7807)

```json
{
  "code": "NOT_TEAM_LEADER",
  "message": "Chỉ Team Leader được thực hiện hành động này.",
  "traceId": "..."
}
```

## Ví dụ

### Request

```http
PUT /v1/reports/3fa85f64-5717-4562-b3fc-2c963f66afa6/accept
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response (thành công)

```
HTTP/1.1 204 No Content
```

### Response (leader gọi nhưng team không được assign)

```json
HTTP/1.1 422 Unprocessable Entity

{
  "code": "ASSIGNMENT_NOT_FOUND",
  "message": "Không tìm thấy assignment tương ứng với team của bạn."
}
```

## Flow trạng thái sau khi accept

```
Report:     Assigned → InProgress
Assignment: Assigned → InProgress
```

## Thay đổi so với phiên bản cũ

> Nếu FE đang dùng version cũ có truyền body `{ "teamId": "..." }`, hãy bỏ body đó đi.

| | Cũ | Mới |
|---|---|---|
| Body | `{ "teamId": "uuid" }` | *(không có)* |
| Xác định team | Client truyền `teamId` | Backend tự resolve từ token |
| Kiểm tra leader | Không có | Bắt buộc — non-leader trả `422` |
