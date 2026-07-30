import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { haversineKm } from '@/utils/geo';

interface UseArrivalDistanceOptions {
  /** Toạ độ hiện trường — null/undefined khi hồ sơ không có GPS. */
  latitude?: number | null;
  longitude?: number | null;
  /** Chỉ lấy GPS khi bước confirm-arrival đang mở. */
  enabled: boolean;
}

/**
 * Lấy vị trí inspector và tính khoảng cách tới hiện trường (GPS mềm BR-INS-033).
 * `distanceMeters === null` nghĩa là không so sánh được → note bắt buộc.
 */
export function useArrivalDistance({
  latitude,
  longitude,
  enabled,
}: UseArrivalDistanceOptions) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const locate = useCallback(async () => {
    setLocating(true);
    setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError('Chưa được cấp quyền vị trí.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setLocationError('Không xác định được vị trí hiện tại.');
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || coords) return;
    void locate();
  }, [enabled, coords, locate]);

  const hasScene = typeof latitude === 'number' && typeof longitude === 'number';
  const distanceMeters =
    coords && hasScene
      ? haversineKm(coords.latitude, coords.longitude, latitude, longitude) * 1000
      : null;

  return { coords, distanceMeters, isLocating, locationError, retryLocation: locate };
}
