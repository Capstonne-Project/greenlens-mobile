import * as Location from 'expo-location';
import type { ReportLocationDraft } from '@/types/pollution-report.types';
import type { ExifGpsCoords } from '@/utils/exif-location';

function buildAddressLine(parts: (string | null | undefined)[]): string | undefined {
  const value = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');

  return value || undefined;
}

async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places[0];
    if (!place) return undefined;
    return buildAddressLine([
      place.streetNumber,
      place.street,
      place.district,
      place.city ?? place.subregion,
      place.region,
    ]);
  } catch {
    return undefined;
  }
}

/** Tạo draft vị trí từ tọa độ ảnh (EXIF) + reverse geocode nhẹ nếu được. */
export async function buildLocationDraftFromCoords(
  coords: ExifGpsCoords,
): Promise<ReportLocationDraft> {
  const address = await reverseGeocodeAddress(coords.latitude, coords.longitude);
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    address,
    capturedAt: new Date().toISOString(),
  };
}

export async function resolveCaptureLocation(): Promise<ReportLocationDraft | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return buildLocationDraftFromCoords({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
}
