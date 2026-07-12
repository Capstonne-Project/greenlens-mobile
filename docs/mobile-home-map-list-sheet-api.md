# Home Map — Draggable Bottom Sheet List — Yêu cầu API cho BE

> Bối cảnh: Trang chủ (Home) mobile đổi UI theo mẫu app bất động sản (Zillow/Realtor) — bản đồ full-screen phía trên, bottom sheet kéo lên/xuống đè lên bản đồ ở phía dưới, hiển thị danh sách card báo cáo **theo đúng viewport đang xem trên map**. Kéo/pan bản đồ tới đâu thì danh sách card cập nhật tới đó.
>
> API nền đã tồn tại: `GET /v1/map/reports` (xem `docs/PUBLIC_MAP_VIEWPORT_PLAN.md`). Tài liệu này **không xin endpoint mới** — chỉ xác nhận/yêu cầu bổ sung field cho DTO `mode=detail` để phục vụ hiển thị card đầy đủ thông tin (ảnh, tiêu đề, địa chỉ…) thay vì chỉ marker chấm tròn trên bản đồ.

---

## 1. Field hiện có vs field cần dùng cho list card

Theo `PUBLIC_MAP_VIEWPORT_PLAN.md` §5.1, DTO gốc dự kiến cho `mode=detail` chỉ có:

```json
{ "id": "uuid", "code": "RPT-…", "latitude": 0, "longitude": 0, "severity": "High", "categoryCode": "TRASH", "status": "Verified" }
```

FE hiện đang **optimistically** kỳ vọng thêm các field sau (đã khai báo sẵn trong type `PublicMapReportDto` phía mobile) — cần BE **xác nhận đã trả** hay **bổ sung thêm**:

| Field | Type | Bắt buộc cho card list | Ghi chú |
|---|---|---|---|
| `title` | string \| null | Có | Tiêu đề báo cáo hiển thị nổi bật trên card. Nếu BE không có field title riêng, FE fallback dùng `code`. |
| `description` | string \| null | Nên có | Mô tả ngắn — hiện FE fallback tự tạo từ severity/status nếu thiếu. |
| `address` | string \| null | **Có** | Địa chỉ hiển thị dưới tiêu đề card — **quan trọng nhất trong số các field còn thiếu**. Cần xác nhận mức độ chi tiết được phép lộ ra public (so với BR privacy đã ghi trong plan §4.4 — "không hiển thị địa chỉ đầy đủ trên pin public nếu BR cấm"). Đề xuất: hiển thị tới cấp phường/quận, không cần số nhà cụ thể. |
| `imageUrl` | string \| null | **Có** | Ảnh đại diện đầu tiên của report — dùng làm ảnh lớn trên card (giống ảnh bất động sản). Nếu 1 report có nhiều ảnh, chỉ cần trả **1 ảnh đầu tiên**, không cần trả cả mảng. |
| `reporterCount` | number \| null | Nên có | Số người cùng báo cáo trùng điểm — hiển thị dạng "X người cùng báo cáo". |
| `createdAt` | string (ISO) \| null | Tùy chọn | Không bắt buộc hiển thị trên card nhưng hữu ích để sort mới nhất trước. |

**Field đã đủ, không cần đổi:** `id`, `latitude`, `longitude`, `severity`, `categoryCode`, `status`.

---

## 2. Không cần endpoint/param mới

- Vẫn dùng `GET /v1/map/reports?minLat=&maxLat=&minLng=&maxLng=&mode=detail&limit=&categoryId=` như hiện tại.
- FE tiếp tục debounce theo `onRegionChangeComplete` của `react-native-maps` (đã implement ở `src/hooks/useViewportMapReports.ts`), không cần BE làm gì thêm cho phần trigger.
- `limit` mặc định 200 (max 500) đã đủ cho danh sách trong sheet — **không cần phân trang riêng** ở bản MVP này vì phạm vi luôn giới hạn theo viewport (không phải toàn bộ hệ thống).

## 3. Việc cần BE xác nhận/làm

1. Xác nhận DTO `mode=detail` của `GET /v1/map/reports` **đã bao gồm** `imageUrl`, `address`, `title` hay chưa. Nếu response hiện tại (theo Swagger/handler thật) không có các field này, cần bổ sung vào response DTO.
2. Nếu `address` bị giới hạn theo BR privacy — xác nhận rõ format trả về (ví dụ chỉ "Phường X, Quận Y" thay vì địa chỉ đầy đủ) để FE không cần tự cắt chuỗi phía client.
3. Với `imageUrl`: xác nhận lấy ảnh đầu tiên trong danh sách media của report — không cần thêm bảng/field mới, chỉ là thay đổi projection trong handler `GetPublicMapReports`.
4. Trả `title`: nếu report hiện không có field tiêu đề riêng (chỉ có `code` + `description`), xác nhận với FE để FE tiếp tục dùng `code` làm tiêu đề card thay vì chờ field không tồn tại.

## 4. Không thay đổi

- Danh sách trạng thái hiển thị public (Verified, InProgress, Resolved, Closed) — giữ nguyên theo plan gốc.
- Làm tròn tọa độ (BR-MAP-004) — giữ nguyên, không ảnh hưởng vì card không hiển thị tọa độ chính xác.
- Giới hạn bbox / validator — giữ nguyên.

---

*Tài liệu bổ sung cho `docs/PUBLIC_MAP_VIEWPORT_PLAN.md` — không thay thế, chỉ làm rõ thêm field cần cho UI list-card mới ở mobile.*
