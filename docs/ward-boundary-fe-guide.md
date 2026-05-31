# Ward Boundary Display Guide

Hướng dẫn hiển thị ranh giới xã/phường lên map khi user chọn.

---

## Flow tổng quan

1. FE gọi BE lấy danh sách ward (kèm `boundaryUrl`)
2. User chọn ward → FE fetch file GeoJSON từ CDN theo `boundaryUrl`
3. FE filter feature theo `ward.code` → render polygon lên map

---

## Bước 1 — Lấy danh sách ward

```
GET /v1/catalog/provinces/{provinceCode}/wards
```

**Response:**
```json
{
  "items": [
    {
      "code": "00004",
      "name": "Phường Phúc Xá",
      "unitAbbreviation": "Phường",
      "boundaryUrl": "https://d3iova6424vljy.cloudfront.net/prod/location/wards/01_part_001.json"
    },
    {
      "code": "00082",
      "name": "Phường Cửa Đông",
      "unitAbbreviation": "Phường",
      "boundaryUrl": "https://d3iova6424vljy.cloudfront.net/prod/location/wards/01_part_001.json"
    }
  ]
}
```

> **Lưu ý:** Nhiều ward có thể dùng chung `boundaryUrl` vì boundaries được nhóm theo file. Đây là bình thường.

---

## Bước 2 — Lấy boundary khi user chọn ward

`boundaryUrl` trỏ tới file GeoJSON dạng **FeatureCollection** chứa nhiều ward. FE cần fetch rồi filter theo `code`:

```js
const cache = {}

async function getWardBoundary(ward) {
  // Cache lại để tránh fetch trùng (nhiều ward dùng chung 1 file)
  if (!cache[ward.boundaryUrl]) {
    cache[ward.boundaryUrl] = await fetch(ward.boundaryUrl).then(r => r.json())
  }

  return cache[ward.boundaryUrl].features.find(
    f => f.properties.code === ward.code
  )
}
```

**Cấu trúc file GeoJSON từ CDN:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "code": "00004", "name": "Phường Phúc Xá" },
      "geometry": { "type": "Polygon", "coordinates": [[...]] }
    },
    {
      "type": "Feature",
      "properties": { "code": "00082", "name": "Phường Cửa Đông" },
      "geometry": { "type": "Polygon", "coordinates": [[...]] }
    }
  ]
}
```

---

## Bước 3 — Render lên map

```js
// Ví dụ với MapLibre / Mapbox GL JS
const feature = await getWardBoundary(selectedWard)

map.getSource('ward-boundary').setData(feature)

// Ví dụ với Leaflet
L.geoJSON(feature).addTo(map)
```

---

## Tóm tắt

| Bước | Việc FE làm |
|------|-------------|
| Load trang | Gọi `GET /v1/catalog/provinces/{provinceCode}/wards`, lưu list ward kèm `boundaryUrl` |
| User chọn ward | Fetch `ward.boundaryUrl` từ CDN — **không đi qua BE** |
| Render | Filter `features` theo `feature.properties.code === ward.code` → vẽ polygon |
| Tối ưu | Cache response CDN theo URL để tránh fetch trùng |
