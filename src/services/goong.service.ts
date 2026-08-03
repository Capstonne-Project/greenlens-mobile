import type {
  GoongDirectionsResponse,
  GoongGeocodeResponse,
  GoongReverseGeocodeResult,
} from '@/types/goong.types';
import { decodePolyline } from '@/utils/polyline';

const GOONG_GEOCODE_URL = 'https://rsapi.goong.io/v2/geocode';
const GOONG_DIRECTIONS_URL = 'https://rsapi.goong.io/Direction';

function pickAddressLine(result: NonNullable<GoongGeocodeResponse['results']>[number]): string | undefined {
  if (result.formatted_address?.trim()) {
    return result.formatted_address.trim();
  }
  if (result.address?.trim()) {
    return result.address.trim();
  }
  return undefined;
}

function pickAdminNames(
  result: NonNullable<GoongGeocodeResponse['results']>[number],
): { provinceName?: string; communeName?: string } {
  const compound = result.compound ?? result.deprecated_compound;
  return {
    provinceName: compound?.province?.trim() || undefined,
    communeName: compound?.commune?.trim() || undefined,
  };
}

export const goongService = {
  reverseGeocode: async (
    latitude: number,
    longitude: number,
  ): Promise<GoongReverseGeocodeResult | null> => {
    const apiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;
    if (!apiKey) {
      return null;
    }

    const params = new URLSearchParams({
      latlng: `${latitude},${longitude}`,
      limit: '1',
      has_vnid: 'true',
      api_key: apiKey,
    });

    const response = await fetch(`${GOONG_GEOCODE_URL}?${params.toString()}`);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GoongGeocodeResponse;
    const top = payload.results?.[0];
    if (!top) {
      return null;
    }

    const { provinceName, communeName } = pickAdminNames(top);
    return {
      formattedAddress: top.formatted_address,
      addressLine: pickAddressLine(top),
      provinceName,
      communeName,
    };
  },

  /**
   * Fetches a route between two points and returns the decoded path + distance in meters.
   * Goong's `vehicle` param only accepts car|bike|truck|taxi|hd (no "walk") — `bike` gives
   * the closest short-distance street-following route for the on-site check-in dialog.
   */
  getWalkingDirections: async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<{ path: { latitude: number; longitude: number }[]; distanceMeters: number } | null> => {
    const apiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;
    if (!apiKey) {
      return null;
    }

    const params = new URLSearchParams({
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      vehicle: 'bike',
      api_key: apiKey,
    });

    const response = await fetch(`${GOONG_DIRECTIONS_URL}?${params.toString()}`);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GoongDirectionsResponse;
    const route = payload.routes?.[0];
    const points = route?.overview_polyline?.points;
    if (!route || !points) {
      return null;
    }

    const distanceMeters = route.legs?.[0]?.distance?.value ?? 0;
    return { path: decodePolyline(points), distanceMeters };
  },
};
