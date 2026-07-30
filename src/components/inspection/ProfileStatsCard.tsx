import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface ProfileStatItem {
  value: string;
  label: string;
}

interface ProfileStatsCardProps {
  items: ProfileStatItem[];
}

/** Hàng thống kê hiệu suất — dùng lại số liệu KPI đã fetch, tránh gọi BE thừa. */
export function ProfileStatsCard({ items }: ProfileStatsCardProps) {
  return (
    <View className="flex-row">
      {items.map((item, index) => (
        <View
          key={item.label}
          className="flex-1 items-center"
          style={index > 0 ? { borderLeftWidth: 1, borderLeftColor: colors.border } : undefined}
        >
          <Text className="text-lg font-bold text-textPrimary">{item.value}</Text>
          <Text className="mt-0.5 text-xs text-textSecondary">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
