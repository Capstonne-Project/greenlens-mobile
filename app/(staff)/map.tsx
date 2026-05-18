import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StaffMapCalloutCard } from '@/components/map/StaffMapCalloutCard';
import { StaffMapPinMarker } from '@/components/map/StaffMapPinMarker';
import { Text } from '@/components/ui/text';
import { HCM_INITIAL_REGION } from '@/constants/map-region';
import { useStaffMapPins } from '@/hooks/useStaffMapPins';
import { useUserMapLocation } from '@/hooks/useUserMapLocation';
import { colors } from '@/theme/colors';
import type { StaffMapPin } from '@/hooks/useStaffMapPins';

const STATUS_LEGEND = [
  { label: 'Mới giao',    color: '#EF4444' },
  { label: 'Đang xử lý', color: '#F97316' },
  { label: 'Hoàn thành',  color: colors.primary },
];

export default function StaffMapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const { pins, isLoading } = useStaffMapPins();
  const { canShowUserLocation, location, refreshLocation, isLocating } = useUserMapLocation();

  const [selectedPin, setSelectedPin] = useState<StaffMapPin | null>(null);

  const handleLocateMe = useCallback(async () => {
    const coords = await refreshLocation();
    if (coords) {
      mapRef.current?.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 600);
    }
  }, [refreshLocation]);

  const handlePinPress = useCallback((pin: StaffMapPin) => {
    setSelectedPin(pin);
    mapRef.current?.animateToRegion({
      latitude: pin.latitude,
      longitude: pin.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }, 400);
  }, []);

  return (
    <View className="flex-1 bg-background">
      {/* MapView full screen */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          ...HCM_INITIAL_REGION,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        showsUserLocation={canShowUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={() => setSelectedPin(null)}
      >
        {pins.map((pin) => (
          <StaffMapPinMarker key={pin.id} pin={pin} onPress={handlePinPress} />
        ))}
      </MapView>

      {/* Header overlay */}
      <View
        className="absolute left-0 right-0 flex-row items-center gap-3 px-4"
        style={{ top: insets.top + 8 }}
      >
        <View
          className="flex-1 flex-row items-center gap-2 rounded-2xl bg-white px-3 py-2.5"
          style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 }}
        >
          <Ionicons name="map" size={16} color={colors.primary} />
          <Text className="flex-1 text-sm font-semibold text-textPrimary">
            Bản đồ nhiệm vụ · {pins.length} task
          </Text>
          {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      {/* Legend overlay */}
      <View
        className="absolute left-4 flex-row items-center gap-2 rounded-2xl bg-white px-3 py-2"
        style={{
          top: insets.top + 68,
          elevation: 3,
          shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
        }}
      >
        {STATUS_LEGEND.map((s) => (
          <View key={s.label} className="flex-row items-center gap-1">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <Text className="text-[11px] text-textSecondary">{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Locate me button */}
      <View
        className="absolute right-4"
        style={{ bottom: insets.bottom + 16 }}
      >
        <Pressable
          onPress={handleLocateMe}
          className="h-12 w-12 items-center justify-center rounded-full bg-white"
          style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8 }}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={22} color={colors.primary} />
          )}
        </Pressable>
      </View>

      {/* Selected pin card */}
      {selectedPin && (
        <View className="absolute left-0 right-0" style={{ bottom: insets.bottom + 16 }}>
          <StaffMapCalloutCard pin={selectedPin} onDismiss={() => setSelectedPin(null)} />
        </View>
      )}
    </View>
  );
}
