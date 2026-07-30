import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import MapView from 'react-native-maps';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StaffCommunityCalloutCard } from '@/components/map/StaffCommunityCalloutCard';
import { StaffCommunityPinMarker } from '@/components/map/StaffCommunityPinMarker';
import { StaffMapCalloutCard } from '@/components/map/StaffMapCalloutCard';
import { StaffMapPinMarker } from '@/components/map/StaffMapPinMarker';
import { Text } from '@/components/ui/text';
import { HCM_INITIAL_REGION } from '@/constants/map-region';
import { useStaffCommunityPins } from '@/hooks/useStaffCommunityPins';
import { useStaffMapPins } from '@/hooks/useStaffMapPins';
import { useUserMapLocation } from '@/hooks/useUserMapLocation';
import { colors } from '@/theme/colors';
import type { StaffCommunityPin } from '@/hooks/useStaffCommunityPins';
import type { StaffMapPin } from '@/hooks/useStaffMapPins';

/** Màu pin nhiệm vụ — khớp `STATUS_COLOR` trong useStaffMapPins. */
const TASK_LEGEND = [
  { label: 'Mới giao',    color: '#EF4444' },
  { label: 'Đang xử lý',  color: '#F97316' },
  { label: 'Hoàn thành',  color: colors.primary },
  { label: 'Chuyển cấp',  color: '#7C3AED' },
  { label: 'Đã từ chối',  color: '#9CA3AF' },
];

/** Màu pin cộng đồng — khớp `COMMUNITY_STATUS_COLOR` trong useStaffCommunityPins. */
const COMMUNITY_LEGEND = [
  { label: 'Đang mở đăng ký', color: '#0EA5E9' },
  { label: 'Đã đóng đăng ký', color: '#6366F1' },
  { label: 'Đang dọn',        color: '#8B5CF6' },
  { label: 'Chờ xác minh',    color: '#D946EF' },
  { label: 'Hoàn thành',      color: colors.primary },
];

/** Icon theo mức độ ô nhiễm — khớp `SEVERITY_ICON` trong StaffMapPinMarker. */
const SEVERITY_LEGEND: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Thấp',         icon: 'leaf' },
  { label: 'Trung bình',   icon: 'warning' },
  { label: 'Cao',          icon: 'flame' },
  { label: 'Nghiêm trọng', icon: 'nuclear' },
];

function LegendDotRow({ label, color }: { label: string; color: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-[11px] text-textSecondary">{label}</Text>
    </View>
  );
}

export default function StaffMapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const { pins, isLoading } = useStaffMapPins();
  const { pins: communityPins, isLoading: isCommunityLoading } = useStaffCommunityPins();
  const { canShowUserLocation, refreshLocation, isLocating } = useUserMapLocation();

  const [selectedPin, setSelectedPin] = useState<StaffMapPin | null>(null);
  const [selectedCommunityPin, setSelectedCommunityPin] = useState<StaffCommunityPin | null>(null);
  const [showCommunity, setShowCommunity] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  const hasCommunity = communityPins.length > 0;

  const clearSelection = useCallback(() => {
    setSelectedPin(null);
    setSelectedCommunityPin(null);
  }, []);

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
    setSelectedCommunityPin(null);
    setSelectedPin(pin);
    mapRef.current?.animateToRegion({
      latitude: pin.latitude,
      longitude: pin.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }, 400);
  }, []);

  const handleCommunityPinPress = useCallback((pin: StaffCommunityPin) => {
    setSelectedPin(null);
    setSelectedCommunityPin(pin);
    mapRef.current?.animateToRegion({
      latitude: pin.latitude,
      longitude: pin.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }, 400);
  }, []);

  const toggleLegend = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLegend((prev) => !prev);
  }, []);

  const toggleCommunity = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCommunity((prev) => {
      if (prev) setSelectedCommunityPin(null);
      return !prev;
    });
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
        onPress={clearSelection}
      >
        {pins.map((pin) => (
          <StaffMapPinMarker key={pin.id} pin={pin} onPress={handlePinPress} />
        ))}

        {showCommunity &&
          communityPins.map((pin) => (
            <StaffCommunityPinMarker
              key={`community-${pin.id}`}
              pin={pin}
              onPress={handleCommunityPinPress}
            />
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
            {hasCommunity && showCommunity ? ` · ${communityPins.length} cộng đồng` : ''}
          </Text>
          {isLoading || isCommunityLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
        </View>
      </View>

      {/* ── Ghi chú ký hiệu (góc trái) ── */}
      <View className="absolute left-4" style={{ top: insets.top + 68 }}>
        <Pressable
          onPress={toggleLegend}
          className="self-start rounded-2xl bg-white"
          style={{
            elevation: 3,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 6,
            maxWidth: 208,
          }}
        >
          {/* Tiêu đề — bấm để thu gọn/mở rộng */}
          <View className="flex-row items-center gap-1.5 px-3 py-2">
            <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
            <Text className="flex-1 text-[11px] font-bold uppercase tracking-wider text-textPrimary">
              Ghi chú
            </Text>
            <Ionicons
              name={showLegend ? 'chevron-up' : 'chevron-down'}
              size={13}
              color={colors.textSecondary}
            />
          </View>

          {showLegend ? (
            <Animated.View entering={FadeIn.duration(180)} className="px-3 pb-3">
              {/* Nhiệm vụ — pin tròn */}
              <View className="mb-1.5 flex-row items-center gap-1.5">
                <View
                  className="h-4 w-4 items-center justify-center rounded-full border border-white"
                  style={{ backgroundColor: '#F97316' }}
                >
                  <Ionicons name="warning" size={8} color={colors.white} />
                </View>
                <Text className="text-[10px] font-bold text-textPrimary">
                  Pin tròn — Nhiệm vụ
                </Text>
              </View>
              <View className="ml-1 gap-1">
                {TASK_LEGEND.map((s) => (
                  <LegendDotRow key={s.label} label={s.label} color={s.color} />
                ))}
              </View>

              {/* Mức độ — icon bên trong pin */}
              <View
                className="mt-2.5 border-t pt-2"
                style={{ borderColor: colors.border }}
              >
                <Text className="mb-1 text-[10px] font-bold text-textPrimary">
                  Icon = mức độ
                </Text>
                <View className="ml-1 gap-1">
                  {SEVERITY_LEGEND.map((s) => (
                    <View key={s.label} className="flex-row items-center gap-2">
                      <Ionicons name={s.icon} size={11} color={colors.textSecondary} />
                      <Text className="text-[11px] text-textSecondary">{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Cộng đồng — pin vuông, chỉ hiện khi có */}
              {hasCommunity ? (
                <View
                  className="mt-2.5 border-t pt-2"
                  style={{ borderColor: colors.border }}
                >
                  <View className="mb-1.5 flex-row items-center gap-1.5">
                    <View
                      className="flex-row items-center rounded border border-white px-1 py-0.5"
                      style={{ backgroundColor: '#8B5CF6' }}
                    >
                      <Ionicons name="people" size={8} color={colors.white} />
                    </View>
                    <Text className="flex-1 text-[10px] font-bold text-textPrimary">
                      Pin vuông — Cộng đồng
                    </Text>
                  </View>
                  <Text className="mb-1 ml-1 text-[10px] text-textDisabled">
                    Số trên pin = người tham gia
                  </Text>
                  <View className="ml-1 gap-1">
                    {COMMUNITY_LEGEND.map((s) => (
                      <LegendDotRow key={s.label} label={s.label} color={s.color} />
                    ))}
                  </View>
                </View>
              ) : null}
            </Animated.View>
          ) : null}
        </Pressable>
      </View>

      {/* Toggle lớp cộng đồng — chỉ hiện khi user thực sự dẫn chương trình nào */}
      {hasCommunity ? (
        <Pressable
          onPress={toggleCommunity}
          className="absolute right-4 flex-row items-center gap-1.5 rounded-full px-3 py-2"
          style={{
            top: insets.top + 68,
            backgroundColor: showCommunity ? '#8B5CF6' : colors.white,
            elevation: 4,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 8,
          }}
        >
          <Ionicons
            name={showCommunity ? 'people' : 'people-outline'}
            size={15}
            color={showCommunity ? colors.white : colors.textSecondary}
          />
          <Text
            className="text-[11px] font-bold"
            style={{ color: showCommunity ? colors.white : colors.textSecondary }}
          >
            {communityPins.length}
          </Text>
        </Pressable>
      ) : null}

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
      {selectedPin ? (
        <View className="absolute left-0 right-0" style={{ bottom: insets.bottom + 16 }}>
          <StaffMapCalloutCard pin={selectedPin} onDismiss={() => setSelectedPin(null)} />
        </View>
      ) : selectedCommunityPin ? (
        <View className="absolute left-0 right-0" style={{ bottom: insets.bottom + 16 }}>
          <StaffCommunityCalloutCard
            pin={selectedCommunityPin}
            onDismiss={() => setSelectedCommunityPin(null)}
          />
        </View>
      ) : null}
    </View>
  );
}
