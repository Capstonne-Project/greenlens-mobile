import { isPointInAnyPolygonGroup } from '@/utils/point-in-polygon';
import type { LatLng } from 'react-native-maps';

export interface PinBoundaryValidationInput {
  point: LatLng;
  provinceCode: string | null;
  wardCode: string | null;
  provincePolygonGroups: LatLng[][][];
  wardPolygonGroups: LatLng[][][];
}

export interface PinBoundaryValidationResult {
  valid: boolean;
  message?: string;
}

export function validatePinAgainstBoundary(
  input: PinBoundaryValidationInput,
): PinBoundaryValidationResult {
  const { point, provinceCode, wardCode, provincePolygonGroups, wardPolygonGroups } = input;

  if (wardCode && wardPolygonGroups.length > 0) {
    if (!isPointInAnyPolygonGroup(wardPolygonGroups, point)) {
      return {
        valid: false,
        message: 'Vị trí pin phải nằm trong ranh giới phường/xã đã chọn.',
      };
    }
    return { valid: true };
  }

  if (provinceCode && provincePolygonGroups.length > 0) {
    if (!isPointInAnyPolygonGroup(provincePolygonGroups, point)) {
      return {
        valid: false,
        message: 'Vị trí pin phải nằm trong ranh giới tỉnh/thành phố đã chọn.',
      };
    }
    return { valid: true };
  }

  return { valid: true };
}
