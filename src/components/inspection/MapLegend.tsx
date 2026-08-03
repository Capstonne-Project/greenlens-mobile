import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { MAP_LEGEND_ITEMS } from '@/utils/inspection-map-legend';

/** Ghi chú màu pin trên bản đồ — thu gọn mặc định, bấm để xem đầy đủ. */
export function MapLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Chú thích bản đồ"
      onPress={() => setExpanded((v) => !v)}
      className="rounded-xl border border-border bg-white px-3 py-2 shadow-sm"
    >
      {expanded ? (
        <View>
          <View className="mb-1.5 flex-row items-center justify-between gap-4">
            <Text className="text-[11px] font-bold text-textPrimary">Chú thích</Text>
            <Ionicons name="chevron-up" size={14} color={colors.textSecondary} />
          </View>
          {MAP_LEGEND_ITEMS.map((item) => (
            <View key={item.status} className="mb-1 flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <Text className="text-[11px] text-textSecondary">{item.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
          <Text className="text-[11px] font-semibold text-textSecondary">Chú thích</Text>
          <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
        </View>
      )}
    </Pressable>
  );
}
