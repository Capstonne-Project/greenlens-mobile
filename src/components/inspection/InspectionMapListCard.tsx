import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { SlaCountdown } from '@/shared/components/SlaCountdown';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { colors } from '@/theme/colors';
import type { InspectionQueueItem } from '@/types/inspection.types';

interface InspectionMapListCardProps {
  item: InspectionQueueItem;
  /** Khoảng cách từ vị trí inspector (m) — null khi chưa có GPS. */
  distanceMeters: number | null;
  selected: boolean;
  onPress: (item: InspectionQueueItem) => void;
  onOpenDetail: (id: string) => void;
  onNavigate: (item: InspectionQueueItem) => void;
}

function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)}m`
    : `${(meters / 1000).toFixed(1)}km`;
}

function InspectionMapListCardBase({
  item,
  distanceMeters,
  selected,
  onPress,
  onOpenDetail,
  onNavigate,
}: InspectionMapListCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Hồ sơ ${item.reportCode}`}
      onPress={() => onPress(item)}
      className="mx-4 mb-2.5 rounded-2xl border bg-white p-3.5"
      style={{ borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 1.5 : 1 }}
    >
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="font-mono text-[11px] tracking-wide text-textSecondary">
          {item.reportCode}
        </Text>
        <StatusBadge kind="inspection" status={item.status} />
      </View>

      <Text className="text-sm font-bold leading-5 text-textPrimary" numberOfLines={1}>
        {item.violatorName || 'Chưa xác định đối tượng'}
      </Text>

      <View className="mt-1 flex-row items-center gap-2">
        {distanceMeters !== null ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="navigate-outline" size={12} color={colors.primary} />
            <Text className="text-[11px] font-bold text-primary">
              {formatDistance(distanceMeters)}
            </Text>
          </View>
        ) : null}
        {item.isRepeatOffender ? (
          <Text className="text-[11px] font-bold uppercase" style={{ color: colors.error }}>
            Tái phạm
          </Text>
        ) : null}
      </View>

      {item.address ? (
        <Text className="mt-1 text-[11px] leading-4 text-textSecondary" numberOfLines={1}>
          {item.address}
        </Text>
      ) : null}

      <View className="mt-2.5 flex-row items-center justify-between border-t border-border pt-2.5">
        {item.slaInspectionDueAt ? (
          <SlaCountdown dueAt={item.slaInspectionDueAt} />
        ) : (
          <View />
        )}
        <View className="flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chỉ đường"
            hitSlop={8}
            onPress={() => onNavigate(item)}
            className="flex-row items-center gap-1"
          >
            <Ionicons name="map-outline" size={14} color={colors.primary} />
            <Text className="text-[11px] font-bold text-primary">Chỉ đường</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở hồ sơ"
            hitSlop={8}
            onPress={() => onOpenDetail(item.id)}
            className="flex-row items-center gap-1"
          >
            <Text className="text-[11px] font-bold text-primary">Mở hồ sơ</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export const InspectionMapListCard = memo(InspectionMapListCardBase);
