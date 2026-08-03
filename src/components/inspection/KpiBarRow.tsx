import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface KpiBarRowProps {
  label: string;
  /** 0–100. */
  percent: number;
  caption?: string;
  color?: string;
}

/** Thanh tiến độ ngang tĩnh — dùng cho tỉ lệ %. */
export function KpiBarRow({
  label,
  percent,
  caption,
  color = colors.primary,
}: KpiBarRowProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View>
      <View className="mb-1.5 flex-row items-end justify-between">
        <Text className="text-sm font-semibold text-textPrimary">{label}</Text>
        <Text className="text-sm font-bold" style={{ color }}>
          {Math.round(clamped)}%
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-surface">
        <View style={{ width: `${clamped}%`, backgroundColor: color }} className="h-full rounded-full" />
      </View>
      {caption ? (
        <Text className="mt-1 text-[11px] text-textSecondary">{caption}</Text>
      ) : null}
    </View>
  );
}
