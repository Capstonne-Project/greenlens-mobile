import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface SlaAlertStripProps {
  overdueCount: number;
  slaBreachCount: number;
  onPress: () => void;
}

/** Dải cảnh báo — chỉ hiện khi thực sự có hồ sơ quá hạn hoặc vi phạm SLA. */
export function SlaAlertStrip({
  overdueCount,
  slaBreachCount,
  onPress,
}: SlaAlertStripProps) {
  if (overdueCount === 0 && slaBreachCount === 0) return null;

  const parts: string[] = [];
  if (overdueCount > 0) parts.push(`${overdueCount} hồ sơ quá hạn nộp phạt`);
  if (slaBreachCount > 0) parts.push(`${slaBreachCount} hồ sơ vi phạm SLA`);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl bg-red-50 px-3.5 py-3"
    >
      <Ionicons name="alert-circle" size={18} color={colors.error} />
      <View className="flex-1">
        <Text className="text-sm font-bold" style={{ color: '#991B1B' }}>
          Cần xử lý ngay
        </Text>
        <Text className="mt-0.5 text-xs leading-4" style={{ color: '#B91C1C' }}>
          {parts.join(' · ')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#B91C1C" />
    </Pressable>
  );
}
