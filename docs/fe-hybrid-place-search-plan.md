# Hybrid Place Search — Đặc tả triển khai

> **Mục tiêu:** Ô search trên bản đồ Citizen gợi ý địa giới (tỉnh/phường) từ dữ liệu BE,
> chọn gợi ý → vẽ boundary có sẵn + zoom vừa khít vùng đó + lọc báo cáo trong vùng.
>
> **Trạng thái:** ✅ Đã triển khai (Phase 1 + Phase 2) — 2026-07-30.
> Còn lại: kiểm thử trên máy thật (đặc biệt lớp mờ `holes` trên Android) theo mục 12.
> **Ngày:** 2026-07-30

---

## 1. Vì sao làm được nhanh

Phần khó nhất (boundary GeoJSON) **đã có sẵn và đang chạy thật** ở luồng chọn địa chỉ khi
tạo báo cáo. Việc còn lại chủ yếu là dựng UI search và nối dây.

### Đã có — BE

| Endpoint | Auth | Trả về |
|---|---|---|
| `GET /v1/catalog/provinces` | `AllowAnonymous` | `{ code, name, boundaryUrl }` |
| `GET /v1/catalog/provinces/{code}/wards` | `AllowAnonymous` | `{ code, name, unitAbbreviation, boundaryUrl }` |

`boundaryUrl` = GeoJSON đặt trên CDN. **Không cần sửa BE cho Phase 1.**

### Đã có — FE

| File | Dùng được gì |
|---|---|
| `src/services/catalog.service.ts` | `getProvinces()`, `getWardsByProvince()` — qua `apiPublic` |
| `src/utils/ward-boundary.ts` | `fetchProvinceBoundaryGroups()`, `fetchWardBoundaryGroups()` → `LatLng[][][]` |
| `src/utils/geojson-boundaries.ts` | Parse GeoJSON, xử lý MultiPolygon, chuẩn hoá mã phường |
| `src/utils/point-in-polygon.ts` | `isPointInAnyPolygonGroup(groups, point)` — lọc báo cáo theo vùng |
| `src/hooks/useCatalogAddress.ts` | Tham chiếu mẫu: load + cache provinces, load boundary |
| `src/types/catalog.types.ts` | `CatalogProvince`, `CatalogWard` |

**GeoJSON đã được cache in-memory** trong `ward-boundary.ts` (`rawGeoJsonCache`), nên chọn
lại cùng một tỉnh không tải lại mạng.

### Chưa có

- Ô search ở `src/components/map/CitizenHomeHeader.tsx:27` đang **`editable={false}`** —
  chỉ là hình trang trí, bấm không có gì xảy ra.
- `normalizeAdminName()` (bỏ dấu + bỏ tiền tố "Tỉnh/TP/Phường/Xã") đang là **hàm private**
  trong `src/utils/goong-admin-match.ts:6`. Cần tách ra dùng chung.

---

## 2. Phạm vi

### Phase 1 — Search địa giới (tài liệu này)

- Gõ → gợi ý **tỉnh/thành**; nếu đang ở trong 1 tỉnh thì gợi ý thêm **phường/xã** của tỉnh đó
- Chọn → vẽ polygon boundary + zoom vừa khít
- **Chỉ hiện báo cáo trong vùng** — báo cáo ngoài ranh giới bị ẩn (map + sheet đồng bộ)
- **Làm mờ phần map ngoài vùng** — khoét lỗ đúng vùng đã chọn để mắt tập trung vào đó
- Không cần sửa BE

> **Đã chốt với anh Hậu (2026-07-30):** search địa danh thì map **chỉ hiện đúng vùng đó** —
> lọc báo cáo theo ranh giới **và** làm mờ bên ngoài. Đây là hành vi cốt lõi của Phase 1,
> không phải tuỳ chọn thêm.

### Phase 2 — Search báo cáo (✅ đã làm luôn)

Đã thêm `string? Keyword` vào `GetReportsQuery` + lọc theo `Code`/`Description`/`Address`
trong handler, và `[FromQuery] string? keyword` ở `ReportsController.GetAllAsync`.
FE gọi qua `reportSearchService.search()` + `useReportSearch()` (debounce 300ms,
bỏ kết quả request cũ). Kết quả hiện ở section **"Báo cáo"** dưới địa giới trong overlay.

Dùng `.ToLower().Contains()` theo đúng pattern đã có ở `GetAdminReportsQueryHandler`
và `GetAdminPollutionCategoriesQueryHandler` — chưa cần index full-text ở quy mô hiện tại.

---

## 3. Quyết định thiết kế

### 3.1. Vì sao lọc client-side, không thêm API search

Số tỉnh/thành ở cấp quốc gia chỉ vài chục bản ghi (dữ liệu nằm trong DB, chưa đếm chính
xác — cần xác nhận khi chạy thật). Tải 1 lần rồi lọc trong bộ nhớ cho kết quả **tức thì**,
không debounce, không loading spinner, chạy được cả khi mạng chậm. Thêm endpoint search
cho vài chục bản ghi là thừa.

### 3.2. Phường: nạp TẤT CẢ ngay từ đầu

> ⚠️ **Sửa lại so với bản kế hoạch đầu.** Ban đầu tôi định chỉ nạp phường sau khi người
> dùng chọn tỉnh, vì tưởng toàn quốc có ~10.000 phường. **Đo thật thì chỉ 3.321 phường
> / 34 tỉnh, tải song song hết ~0.4s** — nên nạp hết ngay khi mở app là hoàn toàn ổn.

**Vì sao BẮT BUỘC phải nạp hết:** sau sáp nhập hành chính 2025, nhiều tên tỉnh cũ trở
thành tên **phường**. Ví dụ đo thật trên BE:

```
GET /catalog/provinces          -> 34 tỉnh, KHÔNG có "Bến Tre"
GET /catalog/provinces/86/wards -> "Phường Bến Tre" thuộc Vĩnh Long
```

Người dùng vẫn gõ tên cũ ("Bến Tre", "Bình Dương", "Hậu Giang"…). Nếu chỉ nạp phường
sau khi chọn tỉnh thì gõ "Bến Tre" **không ra gì cả** — người dùng tưởng app lỗi.

Kết quả tỉnh **luôn xếp trước** phường, giới hạn riêng từng nhóm (6 tỉnh / 12 phường)
để phường không đẩy tỉnh ra khỏi danh sách.

### 3.3. Recent searches — dùng SecureStore hay bỏ

`@react-native-async-storage/async-storage` **chưa được cài** trong `package.json`.
Theo quy tắc dự án (*"Không thêm thư viện mới mà không thông báo lý do"*), có 3 lựa chọn:

| Cách | Đánh giá |
|---|---|
| **A. Bỏ recent searches** (đề xuất) | Phase 1 không cần. Danh sách tỉnh ngắn, gõ 2 chữ là ra. |
| B. Dùng `expo-secure-store` (đã có) | Sai mục đích — SecureStore dành cho token, chậm hơn, giới hạn 2KB/khoá |
| C. Cài AsyncStorage | Cần anh đồng ý trước |

**Đề xuất A** cho Phase 1.

---

## 4. Kiến trúc

```
CitizenHomeHeader (ô search — bật editable)
        │ onFocus
        ▼
PlaceSearchOverlay ◄──── usePlaceSearch()  ──── catalogService (provinces/wards)
        │ onSelect(suggestion)                    normalizeAdminName()
        ▼
app/(tabs)/index.tsx
        ├── useAreaBoundary()  ──── fetchProvinceBoundaryGroups / fetchWardBoundaryGroups
        │        └── polygonGroups: LatLng[][][]
        ├── <AreaDimMask>        (làm mờ ngoài vùng — vẽ TRƯỚC)
        ├── <Polygon>            (viền ranh giới — vẽ SAU, đè lên lớp mờ)
        ├── fitToCoordinates()   (zoom vừa khít)
        └── pins.filter(isPointInAnyPolygonGroup)   (chỉ hiện báo cáo trong vùng)
```

Tuân thủ phân tầng: `app/` chỉ điều phối · UI ở `src/components/map/` ·
fetch ở `src/hooks/` · HTTP ở `src/services/`.

---

## 5. File cần tạo / sửa

### Tạo mới

| File | Vai trò |
|---|---|
| `src/utils/normalize-vietnamese.ts` | Tách `normalizeAdminName()` ra dùng chung |
| `src/hooks/usePlaceSearch.ts` | Nạp provinces, lọc theo query, nạp wards theo ngữ cảnh |
| `src/hooks/useAreaBoundary.ts` | Fetch + giữ `polygonGroups`, trạng thái loading |
| `src/components/map/PlaceSearchOverlay.tsx` | Overlay full-screen: input + danh sách gợi ý |
| `src/components/map/PlaceSuggestionRow.tsx` | 1 hàng gợi ý (icon + tên + loại) |
| `src/components/map/AreaFocusChip.tsx` | Chip "TP.HCM ✕" hiện vùng đang xem, bấm ✕ để bỏ |
| `src/components/map/AreaDimMask.tsx` | Lớp mờ phủ ngoài vùng, khoét lỗ theo boundary (mục 7.4) |
| `src/types/place-search.types.ts` | `PlaceSuggestion`, `AreaFocus` |

### Sửa

| File | Sửa gì |
|---|---|
| `src/components/map/CitizenHomeHeader.tsx` | Bỏ `editable={false}`, thêm `onSearchPress` |
| `app/(tabs)/index.tsx` | Nối overlay, `<Polygon>`, `fitToCoordinates`, lọc pin |
| `src/utils/goong-admin-match.ts` | Import `normalizeAdminName` từ util mới (bỏ bản private) |
| `src/components/map/index.ts` | Export component mới |

---

## 6. Hợp đồng dữ liệu

```ts
// src/types/place-search.types.ts

export type PlaceSuggestionKind = 'province' | 'ward';

export interface PlaceSuggestion {
  kind: PlaceSuggestionKind;
  /** Mã tỉnh 2 số hoặc mã phường 5 số */
  code: string;
  name: string;
  /** Nhãn phụ: "Tỉnh/Thành phố" hoặc tên tỉnh cha */
  subtitle: string;
  boundaryUrl: string | null;
  /** Phường cần mã tỉnh để lấy đúng GeoJSON */
  provinceCode: string;
}

/** Vùng đang được focus trên map sau khi chọn gợi ý */
export interface AreaFocus {
  kind: PlaceSuggestionKind;
  code: string;
  name: string;
  polygonGroups: LatLng[][][];
}
```

---

## 7. Chi tiết hành vi

### 7.1. Xếp hạng gợi ý

Chuẩn hoá cả query và tên (bỏ dấu, bỏ tiền tố "Tỉnh/Thành phố/Phường/Xã", lowercase),
rồi tính điểm:

| Điều kiện | Điểm |
|---|---|
| Trùng khít | 0 |
| Bắt đầu bằng query | 1 |
| Chứa query | 2 |
| Khớp chữ cái đầu các từ (`hcm` → `Hồ Chí Minh`) | 3 |

Sắp theo điểm tăng dần, cùng điểm thì theo tên. **Tỉnh luôn trước phường.**
Giới hạn 8 kết quả để danh sách không đè hết map.

Ví dụ phải chạy đúng: `ho chi minh` · `hochiminh` · `hcm` · `HCM` · `tp hcm` → TP. Hồ Chí Minh

### 7.2. Chọn gợi ý

1. Haptic `Light`, đóng overlay, `Keyboard.dismiss()`
2. Bật `isBoundaryLoading` (chip hiện spinner)
3. Fetch boundary:
   - tỉnh → `fetchProvinceBoundaryGroups(boundaryUrl)`
   - phường → `fetchWardBoundaryGroups(boundaryUrl, code)`
4. `fitToCoordinates(flatCoords, { edgePadding: { top: 120, right: 60, bottom: 320, left: 60 }, animated: true })`
   — `bottom` lớn vì có `DraggableReportsSheet` che phía dưới
5. Lưu `AreaFocus`, hiện `AreaFocusChip`
6. Nếu là tỉnh → nạp wards của tỉnh đó vào bộ gợi ý cho lần search sau

### 7.3. Lọc báo cáo theo vùng

```ts
const visiblePins = useMemo(() => {
  if (!areaFocus) return pins;
  return pins.filter((p) =>
    isPointInAnyPolygonGroup(areaFocus.polygonGroups, {
      latitude: p.latitude,
      longitude: p.longitude,
    }),
  );
}, [pins, areaFocus]);
```

Áp cho **cả marker trên map và danh sách trong sheet** — hai chỗ phải khớp nhau.

> **Lưu ý:** `useViewportMapReports` lấy báo cáo theo khung nhìn. Sau khi
> `fitToCoordinates`, viewport ≈ bounding box của tỉnh (hình chữ nhật), nên vẫn có báo cáo
> ngoài ranh giới thật lọt vào — `point-in-polygon` là bước lọc chính xác. Với tỉnh có
> hình dạng lõm, khác biệt này rất rõ.

### 7.4. Làm mờ phần map ngoài vùng

Dùng **một polygon phủ toàn cầu, khoét lỗ đúng hình vùng đã chọn** — `react-native-maps`
hỗ trợ sẵn `holes?: LatLng[][]` (`node_modules/react-native-maps/lib/MapPolygon.d.ts:37`),
nên không cần thư viện thêm.

```tsx
const WORLD_RING: LatLng[] = [
  { latitude: -85, longitude: -180 },
  { latitude: -85, longitude: 180 },
  { latitude: 85,  longitude: 180 },
  { latitude: 85,  longitude: -180 },
];

// Mỗi outer ring của vùng = 1 lỗ trên lớp mờ.
// Group thứ i của MultiPolygon: ring[0] là outer, ring[1..] là lỗ nội bộ (đảo/enclave).
const maskHoles = areaFocus.polygonGroups.map((group) => group[0]);

<Polygon
  coordinates={WORLD_RING}
  holes={maskHoles}
  fillColor="rgba(15,23,42,0.45)"   // slate-900 45%
  strokeWidth={0}
  tappable={false}
/>
```

Vẽ **lớp mờ trước**, rồi vẽ viền vùng lên trên để đường ranh giới không bị lớp mờ đè.

| Điểm cần lưu ý | Xử lý |
|---|---|
| Vùng nhiều mảnh rời (MultiPolygon) | Mỗi group góp 1 lỗ → mọi mảnh đều sáng |
| Đảo/enclave trong vùng | `group[0]` chỉ lấy outer ring, nên enclave **vẫn bị mờ** — đúng về mặt hành chính |
| Lat ±90 gây lỗi projection | Dùng ±85 (giới hạn Web Mercator) |
| Lớp mờ chặn tap lên map | `tappable={false}` |
| iOS/Android render lỗ khác nhau | Cần kiểm thật 2 nền tảng; nếu Android lỗi thì fallback không làm mờ (mục 10) |

### 7.5. Bỏ focus

Bấm ✕ trên chip → xoá `AreaFocus`, xoá polygon, khôi phục toàn bộ pin.
Camera **giữ nguyên** — người dùng đang xem vùng đó, giật về chỗ cũ là mất ngữ cảnh.

---

## 8. UI/UX

### Ô search (thu gọn)
Giữ đúng vị trí/kích thước hiện tại. Bỏ `editable={false}` → thành `Pressable` mở overlay
(bàn phím trên input trong header dễ bị che bởi map).
Khi có `AreaFocus`: hiện tên vùng thay placeholder.

### Overlay phải dùng `Modal`, không phải `View absolute`

> ⚠️ `<View className="absolute inset-0">` **chỉ che được trong phạm vi screen** —
> bottom tab bar và bottom sheet vẫn nổi lên trên, thấy rõ trong ảnh chụp lần đầu.
> Phải bọc `<Modal statusBarTranslucent>` để overlay chiếm **toàn bộ** màn hình.
> Project đã có tiền lệ ở `ReportCommentsSection.tsx:293`.

### Overlay
- Vào bằng `FadeIn` 200ms, nền trắng, input autofocus + nút back
- **Rỗng:** KHÔNG liệt kê sẵn tỉnh/thành — chỉ hiện lời mời "Nhập tên địa điểm cần tìm"
  kèm ví dụ. Đổ cả danh sách tỉnh ra khi chưa gõ gây rối, người dùng phải cuộn qua
  một đống mục không liên quan.
- **Đang gõ:** danh sách gợi ý, chia section `TỈNH / THÀNH PHỐ` và `PHƯỜNG / XÃ`
- **Không thấy:** icon + "Không tìm thấy địa điểm" + gợi ý gõ lại
- Mỗi hàng: `Pressable` + press scale (theo rule 04), icon bare không nền (theo memory)

### Polygon — CHỈ MỘT lớp duy nhất

`AreaDimMask` tự vẽ viền bằng `strokeColor`/`strokeWidth` của chính nó.

> ⚠️ **KHÔNG** thêm `<Polygon>` riêng cho ranh giới. Lớp mask có `holes`, mà
> `react-native-maps` vẽ stroke cho **cả outer ring và các lỗ** — nên thêm polygon
> viền nữa sẽ có hai đường trùng nhau, hiện thành **"ranh giới 2 màu"**.
> Đây là lỗi đã gặp thật ở lần triển khai đầu.

### Chip vùng đang xem
Nổi dưới header: `📍 TP. Hồ Chí Minh · 12 báo cáo  ✕`
Đang tải boundary → thay số bằng `ActivityIndicator`.

---

## 9. Hiệu năng

### ⚠️ Bắt buộc: chuẩn hoá hình dạng trước khi vẽ (`prepareAreaShape`)

Đo trên dữ liệu CDN thật — đây **không** phải tối ưu sớm, mà là lỗi chặn:

| Tỉnh | Polygon | Điểm | Lng span | Sau xử lý |
|---|---|---|---|---|
| Đà Nẵng | 32 | 38.969 | 5.57 | 1 grp · 589 pts · 1.52 |
| An Giang | 113 | 59.403 | 2.12 | 2 grp · 1.134 pts · 1.74 |
| Cà Mau | 23 | 53.460 | 1.34 | 1 grp · 598 pts · 1.15 |
| Cần Thơ | 1 | 14.126 | 1.07 | 1 grp · 590 pts · 1.06 |

Hai vấn đề gốc:

1. **Đảo xa bờ làm zoom sai.** File Đà Nẵng gồm cả **quần đảo Hoàng Sa** (lng 111.4–112.8,
   cách đất liền ~400km). Polygon đất liền chiếm **94% diện tích** nhưng
   `fitToCoordinates` tính cả đảo → khung nhìn rộng **gấp 3.6 lần**, người dùng thấy
   vùng "quá to" và không nhận ra tỉnh mình chọn.
   → `selectSignificantGroups()` bỏ mảnh có diện tích < 5% mảnh lớn nhất.

2. **Quá nhiều điểm gây lag.** 39–59 nghìn điểm mỗi tỉnh làm tụt FPS rõ rệt.
   → `simplifyRing()` lấy mỗi bước N điểm, tối đa 600 điểm/ring, luôn giữ điểm cuối
   để ring không hở. Ở mức zoom tỉnh/thành mắt không phân biệt được khác biệt.

Kết quả: **giảm ~98% số điểm**, bbox gọn về đúng phần đất liền.

| Rủi ro khác | Cách xử lý |
|---|---|
| GeoJSON tỉnh vài MB (An Giang 5.3MB) | Đã cache in-memory sẵn (`rawGeoJsonCache`) |
| `point-in-polygon` chạy mỗi lần render | Bọc `useMemo` theo `[pins, areaFocus]` |
| Lọc gợi ý mỗi keystroke | Vài chục bản ghi — không cần debounce. Wards (vài trăm/tỉnh) vẫn nhanh, có `useMemo`. |

Không dùng `setTimeout` chờ boundary — `await` trực tiếp, hiện spinner trên chip.

---

## 10. Trường hợp biên

| Tình huống | Xử lý |
|---|---|
| `boundaryUrl === null` | Vẫn chọn được: zoom theo pin trong vùng nếu có, **không vẽ polygon và không làm mờ** (không có hình để khoét lỗ → mờ hết map là sai). Lọc báo cáo lùi về `wardCode`/bbox. Toast "Chưa có ranh giới cho khu vực này". |
| Android render lỗ (`holes`) sai | Fallback: bỏ lớp mờ, chỉ giữ viền + lọc pin. Cần kiểm thật trên máy Android trước khi chốt. |
| Fetch GeoJSON lỗi | Giữ nguyên map, toast "Không tải được ranh giới", không crash |
| GeoJSON rỗng / parse ra 0 polygon | Coi như không có boundary (như trên) |
| Vùng không có báo cáo nào | Sheet hiện empty state "Chưa có báo cáo trong khu vực này" |
| Mất mạng khi mở overlay | Provinces đã cache từ lần trước vẫn search được |
| Chọn phường khi chưa chọn tỉnh | Không xảy ra — phường chỉ vào danh sách sau khi có tỉnh |
| Đổi filter category khi đang focus vùng | Giữ focus, chỉ đổi tập pin |

---

## 11. Thứ tự triển khai

| # | Việc | Ước lượng |
|---|---|---|
| 1 | `normalize-vietnamese.ts` + sửa `goong-admin-match.ts` dùng chung | 15' |
| 2 | `place-search.types.ts` | 10' |
| 3 | `usePlaceSearch.ts` (nạp + lọc + xếp hạng) | 40' |
| 4 | `useAreaBoundary.ts` | 30' |
| 5 | `PlaceSuggestionRow` + `PlaceSearchOverlay` | 60' |
| 6 | Bật ô search trong `CitizenHomeHeader` | 15' |
| 7 | Nối vào `app/(tabs)/index.tsx`: polygon + fit + lọc pin | 50' |
| 8 | Lớp mờ ngoài vùng (`AreaDimMask`) + kiểm iOS/Android | 40' |
| 9 | `AreaFocusChip` | 25' |
| 10 | Trường hợp biên + tinh chỉnh | 40' |

**Tổng ≈ 5–6 giờ.** Mốc dùng được sớm nhất: sau bước 7 (đã search + vẽ vùng + lọc báo cáo,
chưa có lớp mờ và chip bỏ focus).

---

## 12. Nghiệm thu

- [ ] Gõ `hcm`, `ho chi minh`, `hochiminh`, `tp hcm` → đều ra TP. Hồ Chí Minh
- [ ] Chọn tỉnh → polygon đúng ranh giới, zoom vừa khít, không bị sheet che
- [ ] Chỉ báo cáo **trong** ranh giới hiện ra (thử tỉnh có hình lõm)
- [ ] Marker trên map và danh sách trong sheet khớp nhau
- [ ] Phần ngoài vùng bị làm mờ, **trong vùng sáng rõ** — kiểm cả iOS và Android
- [ ] Tỉnh nhiều mảnh rời → **mọi mảnh** đều sáng, không chỉ mảnh lớn nhất
- [ ] Lớp mờ không chặn tap/kéo map
- [ ] Chọn tỉnh rồi search tiếp → có gợi ý phường của tỉnh đó
- [ ] Chọn phường → polygon nhỏ hơn, zoom sâu hơn
- [ ] Bấm ✕ → polygon mất, pin trở lại đầy đủ, camera không giật
- [ ] Tỉnh không có `boundaryUrl` → không crash, có thông báo
- [ ] Bật chế độ máy bay → provinces đã cache vẫn search được
- [ ] Cuộn/zoom map khi đang focus → vẫn 60fps
- [ ] `npx tsc --noEmit` sạch · `npm run lint` 0 errors

---

## 13. Trạng thái các điểm cần chốt

| # | Vấn đề | Trạng thái |
|---|---|---|
| 1 | Lọc báo cáo theo vùng | ✅ **Chốt** — làm trong Phase 1, chỉ hiện báo cáo trong ranh giới |
| 2 | Làm mờ ngoài vùng | ✅ **Chốt** — có làm, kỹ thuật ở mục 7.4 |
| 3 | Recent searches | ⏳ Đề xuất **bỏ** ở Phase 1 (mục 3.3) — AsyncStorage chưa cài, cần anh xác nhận |
| 4 | Search báo cáo theo keyword | ⏳ Đề xuất để **Phase 2** — cần thêm `Keyword` vào `GetReportsQuery` bên BE |

Điểm 3 và 4 không chặn việc bắt đầu code: cả hai đều là phần cộng thêm, không ảnh hưởng
kiến trúc đã mô tả.
