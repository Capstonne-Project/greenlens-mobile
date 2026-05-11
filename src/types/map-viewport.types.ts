/** Khung bbox gửi GET /v1/map/reports — không phụ thuộc thư viện map */
export interface ViewportBBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Vùng khởi tạo map — latitude/longitude + delta — dùng tính bbox lần đầu */
export interface MapViewportRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
