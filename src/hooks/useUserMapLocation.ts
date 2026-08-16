import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { Region } from 'react-native-maps';

const USER_LOCATION_DELTA = {
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
} as const;

export interface UserMapLocation {
  latitude: number;
  longitude: number;
}

export interface UseUserMapLocationResult {
  canShowUserLocation: boolean;
  location: UserMapLocation | null;
  isLocating: boolean;
  permissionDenied: boolean;
  ensurePermission: () => Promise<boolean>;
  refreshLocation: () => Promise<UserMapLocation | null>;
  toRegion: (coords: UserMapLocation) => Region;
}

export function useUserMapLocation(): UseUserMapLocationResult {
  const [canShowUserLocation, setCanShowUserLocation] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [location, setLocation] = useState<UserMapLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const toRegion = useCallback(
    (coords: UserMapLocation): Region => ({
      latitude: coords.latitude,
      longitude: coords.longitude,
      ...USER_LOCATION_DELTA,
    }),
    []
  );

  const refreshLocation = useCallback(async (): Promise<UserMapLocation | null> => {
    setIsLocating(true);
    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: UserMapLocation = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setLocation(coords);
      return coords;
    } catch {
      return null;
    } finally {
      setIsLocating(false);
    }
  }, []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.granted) {
      setCanShowUserLocation(true);
      setPermissionDenied(false);
      return true;
    }

    const requested = await Location.requestForegroundPermissionsAsync();
    const granted = requested.granted;
    setCanShowUserLocation(granted);
    setPermissionDenied(!granted);
    return granted;
  }, []);

  useEffect(() => {
    void (async () => {
      const granted = await ensurePermission();
      if (granted) {
        await refreshLocation();
      }
    })();
  }, [ensurePermission, refreshLocation]);

  return {
    canShowUserLocation,
    location,
    isLocating,
    permissionDenied,
    ensurePermission,
    refreshLocation,
    toRegion,
  };
}
