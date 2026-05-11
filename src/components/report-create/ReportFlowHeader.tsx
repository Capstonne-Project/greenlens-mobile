import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import { colors } from '@/theme/colors';

interface ReportFlowHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export function ReportFlowHeader({ title, subtitle, onBack }: ReportFlowHeaderProps) {
  return (
    <View className="border-b border-border bg-white px-4 pb-4 pt-2">
      <View className="flex-row items-center justify-between">
        <TapScale onPress={onBack}>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </View>
        </TapScale>

        <View className="flex-1 px-3">
          <Text className="text-center text-lg font-bold text-textPrimary">{title}</Text>
          {subtitle ? (
            <Text className="mt-1 text-center text-sm text-textSecondary">{subtitle}</Text>
          ) : null}
        </View>

        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Ionicons name="leaf-outline" size={18} color={colors.primary} />
        </View>
      </View>
    </View>
  );
}
