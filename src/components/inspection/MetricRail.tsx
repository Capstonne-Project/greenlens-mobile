import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

export interface MetricRailItem {
  value: number;
  label: string;
  tone?: 'default' | 'warning' | 'danger';
}

interface MetricRailProps {
  items: MetricRailItem[];
}

const TONE_COLOR: Record<NonNullable<MetricRailItem['tone']>, string> = {
  default: colors.textPrimary,
  warning: colors.warning,
  danger: colors.error,
};

/** Dải metric dạng hàng, ngăn cách bằng đường kẻ — không bọc card riêng từng ô. */
export function MetricRail({ items }: MetricRailProps) {
  return (
    <View className="flex-row flex-wrap">
      {items.map((item, index) => {
        const tone = item.tone ?? 'default';
        const color = TONE_COLOR[tone];
        const isLastInRow = index % 3 === 2;

        return (
          <View
            key={item.label}
            className="mb-4 w-1/3 items-center px-1"
            style={!isLastInRow ? { borderRightWidth: 1, borderRightColor: colors.border } : undefined}
          >
            <Text className="text-lg font-bold" style={{ color }}>
              {item.value}
            </Text>
            <Text className="mt-0.5 text-center text-[11px] leading-4 text-textSecondary" numberOfLines={2}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
