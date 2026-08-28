import { Pressable, View } from 'react-native';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { getGoongStyleUrl } from '@/constants/map-config';
import { colors } from '@/theme/colors';
import { openGoogleMapsDirections } from '@/utils/open-directions';

/** Cùng style chấm đỏ Home map (`CitizenMapPinMarker`) */
const DOT_COLOR = colors.error;

interface ReportLocationMapProps {
  latitude: number;
  longitude: number;
  address?: string | null;
  /** Ẩn nút "Chỉ đường Google Maps" — mặc định hiện khi toạ độ hợp lệ */
  hideDirectionsButton?: boolean;
  /** Ẩn tiêu đề "VỊ TRÍ" — dùng khi màn hình đã có SectionTitle riêng */
  hideHeading?: boolean;
  /** Ẩn dòng địa chỉ phía trên map — dùng khi địa chỉ đã hiển thị ở chỗ khác */
  hideAddress?: boolean;
}

function DirectionsButton({
  latitude,
  longitude,
  address,
}: {
  latitude: number;
  longitude: number;
  address?: string | null;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[animatedStyle, { position: 'absolute', bottom: 10, right: 10 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chỉ đường bằng Google Maps"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          void openGoogleMapsDirections(latitude, longitude, address);
        }}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        }}
        className="flex-row items-center gap-1.5 rounded-full bg-white px-3 py-2"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Ionicons name="navigate" size={15} color={colors.primary} />
        <Text className="text-xs font-bold" style={{ color: colors.primary }}>
          Chỉ đường
        </Text>
      </Pressable>
    </Animated.View>
  );
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
  hideDirectionsButton = false,
  hideHeading = false,
  hideAddress = false,
}: ReportLocationMapProps) {
  if (!isValidCoord(latitude, longitude)) {
    return (
      <View className="mb-4">
        {!hideHeading ? (
          <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
            Vị trí
          </Text>
        ) : null}
        {address && !hideAddress ? (
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
      {!hideHeading ? (
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
          Vị trí
        </Text>
      ) : null}

      {address && !hideAddress ? (
        <View className="mb-2.5 flex-row items-start gap-1.5">
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-sm leading-5 text-textPrimary">{address}</Text>
        </View>
      ) : null}

      <View className="overflow-hidden rounded-2xl border border-border">
        <Map
          style={{ width: '100%', height: 168 }}
          mapStyle={getGoongStyleUrl()}
          pointerEvents="none"
          dragPan={false}
          touchZoom={false}
          touchPitch={false}
          touchRotate={false}
          compass={false}
        >
          <Camera initialViewState={{ center: [longitude, latitude], zoom: 16 }} />
          <Marker id="report-location-dot" lngLat={[longitude, latitude]} anchor="center">
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
        </Map>
        {!hideDirectionsButton ? (
          <DirectionsButton latitude={latitude} longitude={longitude} address={address} />
        ) : null}
      </View>
    </View>
  );
}
