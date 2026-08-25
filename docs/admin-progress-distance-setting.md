# [FE Admin] Cấu hình khoảng cách tối đa khi cập nhật tiến độ (Progress Update Geo-Distance)

## Bối cảnh

Hiện tại khi user (team leader dọn dẹp, đội thanh tra, community lead...) nộp ảnh
tiến độ/hoàn thành công việc, backend sẽ kiểm tra khoảng cách GPS giữa vị trí
nộp ảnh và vị trí hiện trường yêu cầu. Nếu vượt quá ngưỡng cho phép, request bị
**chặn cứng** (không cho nộp), trả lỗi cho mobile hiển thị dialog cảnh báo.

Ngưỡng khoảng cách này (mét) **đã có sẵn cơ chế admin config** — không hardcode.
Task của FE admin là thêm 1 field chỉnh sửa cho setting này vào màn hình
**System Settings** hiện có (nếu màn hình module "Geo" đã tồn tại thì đây chỉ là
thêm 1 dòng, không cần build UI mới).

## Setting mới

| Field | Giá trị |
|---|---|
| Module | `Geo` (route slug: `geo`) |
| Key | `progress_update_max_distance_meters` |
| Kiểu | `Int` |
| Default | `200` |
| Min | `50` |
| Max | `1000` |
| Label (vi) | "Khoảng cách tối đa khi cập nhật tiến độ (mét)" |

Setting này nằm **chung module `Geo`** với các setting khác đã có sẵn trên UI
(ví dụ `check_in_max_distance_meters` — khoảng cách check-in tối đa). Nếu màn
Admin Settings đã render danh sách theo module dạng list/form tự động từ API,
thì **không cần code gì thêm** — field mới sẽ tự xuất hiện khi BE deploy. Mục
đích của file này chủ yếu để FE biết field này tồn tại và validate đúng
min/max khi họ có custom UI riêng cho từng key (thay vì render tự động).

## API liên quan (đã có sẵn, không đổi)

Base route: `v1/admin/system-settings` — yêu cầu role `Admin`
(`Authorization: Bearer <token>` của tài khoản Admin).

### 1. Lấy danh sách setting theo module

```
GET /v1/admin/system-settings/geo
GET /v1/admin/system-settings?module=geo
```

Response:
```json
{
  "code": "SUCCESS",
  "message": "OK",
  "status": 200,
  "data": {
    "items": [
      {
        "id": "guid",
        "module": "Geo",
        "key": "check_in_max_distance_meters",
        "valueType": "Int",
        "value": "200",
        "defaultValue": "200",
        "description": "Khoảng cách check-in tối đa (mét)",
        "minValue": 50,
        "maxValue": 1000,
        "isActive": true
      },
      {
        "id": "guid",
        "module": "Geo",
        "key": "progress_update_max_distance_meters",
        "valueType": "Int",
        "value": "200",
        "defaultValue": "200",
        "description": "Khoảng cách tối đa khi cập nhật tiến độ (mét)",
        "minValue": 50,
        "maxValue": 1000,
        "isActive": true
      }
    ]
  }
}
```

### 2. Cập nhật setting (bulk update, có thể sửa nhiều key cùng lúc)

```
PATCH /v1/admin/system-settings/geo
```

Request body — object phẳng `key: value` (value luôn là string, kể cả số):
```json
{
  "progress_update_max_distance_meters": "300"
}
```

Response — chỉ trả về những key thực sự thay đổi:
```json
{
  "data": {
    "updated": [
      {
        "id": "guid",
        "module": "Geo",
        "key": "progress_update_max_distance_meters",
        "valueType": "Int",
        "value": "300",
        "defaultValue": "200",
        "description": "Khoảng cách tối đa khi cập nhật tiến độ (mét)",
        "minValue": 50,
        "maxValue": 1000,
        "isActive": true
      }
    ]
  }
}
```

Lỗi thường gặp:
- Giá trị ngoài `minValue`/`maxValue` → `400 Bad Request`, message giải thích rõ khoảng hợp lệ.
- Key không tồn tại → lỗi "key not found".
- Body rỗng → lỗi "update empty".

### 3. Reset về mặc định (nếu cần nút "Khôi phục mặc định")

```
POST /v1/admin/system-settings/geo/reset
```

Không cần body. Trả về toàn bộ list settings của module `Geo` sau khi reset
(bao gồm cả `progress_update_max_distance_meters` về lại `200`).

## Việc FE admin cần làm

1. Nếu UI render tự động theo `items[]` từ API (form generic key → input theo
   `valueType`/`minValue`/`maxValue`) → **không cần code gì**, chỉ cần verify
   field mới hiện đúng và validate min/max hoạt động.
2. Nếu UI hardcode từng field riêng theo key (không render tự động) → thêm 1
   input số cho key `progress_update_max_distance_meters`, dùng chung style với
   `check_in_max_distance_meters`, validate range 50–1000, đơn vị "mét".
3. Không cần thêm quyền/role mới — dùng chung policy `Admin` hiện có của toàn
   bộ System Settings.

## Lưu ý

- Setting này hiện đang trong quá trình BE code/test, **chưa merge/deploy**.
  FE có thể bắt đầu code UI theo contract trên, nhưng cần chờ xác nhận BE đã
  deploy lên môi trường tương ứng trước khi test end-to-end.
- Đây là setting độc lập với `check_in_max_distance_meters` (khoảng cách
  check-in ban đầu) — đổi 1 cái không ảnh hưởng cái kia.
