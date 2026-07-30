import type { LatLng } from 'react-native-maps';

/**
 * Diện tích tương đối của một ring (shoelace, đơn vị độ²).
 * Chỉ dùng để so sánh mảnh nào lớn hơn — không phải diện tích thật.
 */
function ringArea(ring: LatLng[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += ring[j].longitude * ring[i].latitude - ring[i].longitude * ring[j].latitude;
  }
  return Math.abs(sum / 2);
}

/**
 * Giữ lại các mảnh đáng kể của một vùng, bỏ các đảo/mảnh vụn xa bờ.
 *
 * Lý do: file boundary tỉnh gồm cả các quần đảo rất xa đất liền. Ví dụ Đà Nẵng có
 * 32 polygon, trong đó polygon đất liền chiếm 94% diện tích, còn lại là quần đảo
 * Hoàng Sa cách ~400km. Nếu tính hết thì `fitToCoordinates` zoom rộng gấp ~3.6 lần
 * và người dùng thấy vùng "quá to", gần như không nhận ra tỉnh mình chọn.
 *
 * @param minAreaRatio Mảnh nhỏ hơn tỉ lệ này so với mảnh lớn nhất sẽ bị bỏ.
 */
export function selectSignificantGroups(
  groups: LatLng[][][],
  minAreaRatio = 0.05,
): LatLng[][][] {
  if (groups.length <= 1) return groups;

  const scored = groups
    .map((group) => ({ group, area: group[0] ? ringArea(group[0]) : 0 }))
    .sort((a, b) => b.area - a.area);

  const largest = scored[0]?.area ?? 0;
  if (largest <= 0) return groups;

  return scored
    .filter((entry) => entry.area / largest >= minAreaRatio)
    .map((entry) => entry.group);
}

/**
 * Lọc thưa điểm của một ring bằng cách lấy mỗi bước N điểm, luôn giữ điểm đầu/cuối
 * để ring không bị hở.
 *
 * Ring biên giới có thể tới ~20.000 điểm; vẽ nguyên bản làm tụt FPS rõ rệt mà ở mức
 * zoom tỉnh/thành thì mắt không phân biệt được khác nhau.
 */
export function simplifyRing(ring: LatLng[], maxPoints = 600): LatLng[] {
  if (ring.length <= maxPoints) return ring;

  const step = Math.ceil(ring.length / maxPoints);
  const out: LatLng[] = [];
  for (let i = 0; i < ring.length; i += step) {
    out.push(ring[i]);
  }

  const last = ring[ring.length - 1];
  const tail = out[out.length - 1];
  if (tail.latitude !== last.latitude || tail.longitude !== last.longitude) {
    out.push(last);
  }
  return out;
}

/** Áp `simplifyRing` cho mọi ring trong mọi group. */
export function simplifyGroups(groups: LatLng[][][], maxPoints = 600): LatLng[][][] {
  return groups.map((group) => group.map((ring) => simplifyRing(ring, maxPoints)));
}

/**
 * Chuẩn hoá boundary để vẽ và zoom: bỏ mảnh vụn xa bờ + lọc thưa điểm.
 * Trả về cả `groups` (để vẽ) và `fitCoords` (để `fitToCoordinates`).
 */
export function prepareAreaShape(groups: LatLng[][][]): {
  groups: LatLng[][][];
  fitCoords: LatLng[];
} {
  const significant = selectSignificantGroups(groups);
  const simplified = simplifyGroups(significant);
  // Chỉ lấy outer ring để tính khung nhìn — lỗ bên trong không mở rộng bbox.
  const fitCoords = simplified.flatMap((group) => group[0] ?? []);
  return { groups: simplified, fitCoords };
}
