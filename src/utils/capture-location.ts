import * as Location from 'expo-location';
import type { ReportLocationDraft } from '@/types/pollution-report.types';

function buildAddressLine(parts: (string | null | undefined)[]): string | undefined {
  const value = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');

  return value || undefined;
}

export async function resolveCaptureLocation(): Promise<ReportLocationDraft | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const capturedAt = new Date().toISOString();
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;

  let address: string | undefined;
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places[0];
    if (place) {
      address = buildAddressLine([
        place.streetNumber,
        place.street,
        place.district,
        place.city ?? place.subregion,
        place.region,
      ]);
    }
  } catch {
    address = undefined;
  }

  return {
    latitude,
    longitude,
    address,
    capturedAt,
  };
}
