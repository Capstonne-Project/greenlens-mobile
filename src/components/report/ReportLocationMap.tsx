import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

/** Cùng style chấm đỏ Home map (`CitizenMapPinMarker`) */
const DOT_COLOR = colors.error;

interface ReportLocationMapProps {
  latitude: number;
  longitude: number;
  address?: string | null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Map nhỏ trong report detail — layout/mapType giống citizen home, chấm đỏ vị trí báo cáo */
export function ReportLocationMap({
  latitude,
  longitude,
  address,
}: ReportLocationMapProps) {
  if (!isValidCoord(latitude, longitude)) {
    return (
      <View className="mb-4">
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
          Vị trí
        </Text>
        {address ? (
          <View className="flex-row items-start gap-1.5">
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm leading-5 text-textPrimary">{address}</Text>
          </View>
        ) : (
          <Text className="text-sm text-textSecondary">Chưa có tọa độ trên bản đồ</Text>
        )}
      </View>
    );
  }

  return (
    <View className="mb-4">
      <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
        Vị trí
      </Text>

      {address ? (
        <View className="mb-2.5 flex-row items-start gap-1.5">
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-sm leading-5 text-textPrimary">{address}</Text>
        </View>
      ) : null}

      <View className="overflow-hidden rounded-2xl border border-border">
        <MapView
          style={{ width: '100%', height: 168 }}
          mapType="standard"
          pointerEvents="none"
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          toolbarEnabled={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsPointsOfInterest={false}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }}
        >
          <Marker
            coordinate={{ latitude, longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View className="items-center justify-center" style={{ width: 28, height: 28 }}>
              <View
                className="absolute rounded-full"
                style={{
                  width: 22,
                  height: 22,
                  backgroundColor: 'rgba(239, 68, 68, 0.22)',
                }}
              />
              <View
                className="rounded-full border-2 border-white"
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: DOT_COLOR,
                  shadowColor: '#000',
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 3,
                }}
              />
            </View>
          </Marker>
        </MapView>
      </View>
    </View>
  );
}
