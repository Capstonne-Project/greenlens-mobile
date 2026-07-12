# Xác nhận BE — Home Map List Sheet (phản hồi `mobile-home-map-list-sheet-api.md`)

> File này trả lời trực tiếp mục **"3. Việc cần BE xác nhận/làm"** trong `mobile-home-map-list-sheet-api.md`.
> **Kết luận: KHÔNG cần đổi code backend — mọi field FE yêu cầu đã tồn tại sẵn trong response `GET /v1/map/reports?mode=detail`.**

---

## 1. DTO `mode=detail` — xác nhận đầy đủ field

`PublicMapReportPinDto` (`src/Greenlens.Application/Features/Map/GetPublicMapReports/PublicMapReportPinDto.cs`) **đã có sẵn** toàn bộ field FE cần, response thực tế hiện tại:

```json
{
  "id": "uuid",
  "code": "RPT-2026-0001",
  "latitude": 10.7769,
  "longitude": 106.7009,
  "severity": "High",
  "categoryCode": "TRASH",
  "title": "Rác thải sinh hoạt",
  "categoryIconUrl": "https://cdn.../trash-icon.png",
  "description": "Bãi rác tồn đọng gần cầu...",
  "address": "Phường Bến Nghé, Quận 1, TP.HCM",
  "reporterCount": 3,
  "imageUrl": "https://cdn.../report-thumb.jpg",
  "status": "Verified",
  "createdAt": "2026-07-01T08:00:00Z"
}
```

Đối chiếu bảng field FE liệt kê:

| Field FE yêu cầu | Có sẵn? | Ghi chú |
|---|---|---|
| `title` | ✅ Có | **Không phải field riêng của report** — là `Category.NameVi` (tên danh mục ô nhiễm, vd "Rác thải sinh hoạt"), dùng làm tiêu đề card. Report entity không có field `Title` riêng (chỉ có `Code` + `Description`) — FE **không cần fallback dùng `code`** vì `title` luôn có giá trị (miễn category active). |
| `description` | ✅ Có | Free text do citizen nhập khi submit report. |
| `address` | ✅ Có | Xem mục 2 bên dưới — **là địa chỉ đầy đủ do người dùng tự nhập, KHÔNG bị cắt/rút gọn theo phường/quận.** |
| `imageUrl` | ✅ Có | Ảnh đầu tiên (theo `UploadedAt` sớm nhất) trong media của report, ưu tiên `ThumbnailUrl` nếu có, fallback `Url` gốc. Chỉ trả 1 ảnh, đúng như FE đề xuất. |
| `reporterCount` | ✅ Có | Số lượng người báo cáo trùng điểm (đã merge qua cơ chế duplicate detection BR-REP-030), cùng field đang dùng cho công thức priority BR-OFF-010 ở phía Officer. |
| `createdAt` | ✅ Có | ISO datetime UTC. |

**Field đã đủ, giữ nguyên:** `id`, `latitude`, `longitude`, `severity`, `categoryCode`, `status` — đúng như FE xác nhận.

---

## 2. Về `address` — cần FE lưu ý (khác với đề xuất ban đầu)

FE đề xuất: *"hiển thị tới cấp phường/quận, không cần số nhà cụ thể"*.

**Thực tế hiện tại: `address` là chuỗi tự do do citizen nhập tay khi submit report (`request.Address` → lưu thẳng vào `Report.Address`), có thể chứa địa chỉ chi tiết (số nhà, tên đường...).** Backend **chưa có** cơ chế tự động rút gọn về cấp phường/quận cho `address` — không có reverse-geocoding, không parse chuỗi.

Report có lưu riêng `WardCode`/`ProvinceCode` (dùng để định tuyến Officer/phòng ban xử lý, không phải để hiển thị public), có thể resolve ra tên phường/tỉnh qua bảng danh mục hành chính nếu cần.

→ **Cần quyết định trước khi FE dùng field này trên UI public:**
- Nếu chấp nhận rủi ro lộ địa chỉ chi tiết trên map công khai → dùng `address` như hiện tại, không cần đổi gì.
- Nếu muốn tuân thủ đúng BR privacy (chỉ hiển thị cấp phường/quận) → đây là **việc cần làm thêm ở BE** (đổi field trả về từ `WardCode`/`ProvinceCode` resolve ra tên, thay vì `Report.Address` thô) — **chưa làm, cần bạn xác nhận có muốn làm không** trước khi đụng vào handler này.

## 3. `imageUrl` — xác nhận đúng như FE mô tả

Đã lấy ảnh đầu tiên theo thứ tự upload, ưu tiên thumbnail, chỉ trả 1 URL (không phải mảng). Không cần thay đổi gì.

## 4. `title` — xác nhận cơ chế

Không có field tiêu đề riêng trên `Report`. `title` trong response hiện tại = tên category (`Category.NameVi`). FE dùng field này trực tiếp, **không cần logic fallback sang `code` nữa** vì BE luôn trả `title` có giá trị.

---

## Việc BE cần làm tiếp (nếu có)

- [ ] Không có việc gì bắt buộc — API đã sẵn sàng dùng ngay cho màn Home Map List Sheet.
- [ ] **Chờ xác nhận từ bạn**: có cần giới hạn `address` về cấp phường/quận cho public map không (mục 2)? Nếu có, đây là 1 thay đổi nhỏ ở `GetPublicMapReportsQueryHandler.cs` (đổi projection field `address`) + cần bảng lookup Ward/Province đã có sẵn ở `Infrastructure/Seeders/Location/`.
