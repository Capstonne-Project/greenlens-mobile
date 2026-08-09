import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { colors } from '@/theme/colors';
import { getReportStatusMeta, getSeverityMeta } from '@/utils/report-status';
import type { ReportCategory } from '@/types/report.types';

const CATEGORY_LABEL: Record<ReportCategory, string> = {
  waste: 'Rác thải',
  water_pollution: 'Ô nhiễm nước',
  air_pollution: 'Ô nhiễm không khí',
  noise: 'Tiếng ồn',
  other: 'Khác',
};

const CATEGORY_ICON: Record<ReportCategory, keyof typeof Ionicons.glyphMap> = {
  waste: 'trash',
  water_pollution: 'water',
  air_pollution: 'cloud',
  noise: 'volume-high',
  other: 'help-circle',
};

interface MapReportListCardProps {
  pin: CitizenMapPin;
  /** Nhận `pin` để caller truyền được callback ổn định — giữ `memo` có hiệu lực. */
  onPress: (pin: CitizenMapPin) => void;
}

function MapReportListCardComponent({ pin, onPress }: MapReportListCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const severityMeta = getSeverityMeta(pin.severity);
  const statusMeta = pin.status ? getReportStatusMeta(pin.status) : null;

  const toggleSaved = () => {
    setIsSaved((prev) => !prev);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => onPress(pin)}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 18, stiffness: 260 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 260 }); }}
        className="mx-4 mb-4 overflow-hidden rounded-2xl border border-border bg-white"
      >
        <View className="relative">
          <Image source={{ uri: pin.imageUrl }} style={{ width: '100%', height: 200 }} contentFit="cover" />

          <View className="absolute left-3 top-3 rounded-full px-2.5 py-1" style={{ backgroundColor: severityMeta.bgColor }}>
            <Text className="text-xs font-bold" style={{ color: severityMeta.textColor }}>
              {severityMeta.label}
            </Text>
          </View>

          <Pressable
            onPress={toggleSaved}
            hitSlop={8}
            className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/30"
          >
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={20} color={colors.white} />
          </Pressable>
        </View>

        <View className="gap-2 p-4">
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-1.5">
              <Ionicons name={CATEGORY_ICON[pin.category]} size={15} color={colors.textSecondary} />
              <Text className="text-xs font-semibold uppercase text-textSecondary">
                {CATEGORY_LABEL[pin.category]}
              </Text>
            </View>
            {statusMeta ? (
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: statusMeta.bgColor }}>
                <Text className="text-[11px] font-semibold" style={{ color: statusMeta.textColor }}>
                  {statusMeta.label}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="text-base font-bold uppercase leading-5 text-textPrimary" numberOfLines={2}>
            {pin.title}
          </Text>

          <View className="flex-row items-start gap-1.5">
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm text-textSecondary" numberOfLines={1}>
              {pin.address}
            </Text>
          </View>

          <View className="flex-row items-center justify-between pt-1">
            <View className="flex-row items-center gap-1">
              <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
              <Text className="text-xs text-textSecondary">{pin.watchersCount} người cùng báo cáo</Text>
            </View>
            <Text className="text-xs font-semibold text-primary">Xem chi tiết</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Memo hoá — sheet re-render liên tục khi kéo, không memo thì mọi card (kèm ảnh 200px)
 * dựng lại mỗi frame và làm nghẽn JS thread.
 */
export const MapReportListCard = memo(MapReportListCardComponent);
