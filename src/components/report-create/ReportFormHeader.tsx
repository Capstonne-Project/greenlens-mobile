import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReportFormHeaderProps {
  title: string;
  onBack: () => void;
}

export function ReportFormHeader({ title, onBack }: ReportFormHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="border-b border-border bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 pb-3 pt-2">
        <TapScale onPress={onBack}>
          <View className="h-10 w-10 items-center justify-center">
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </View>
        </TapScale>

        <Text className="flex-1 text-center text-[17px] font-bold text-textPrimary">{title}</Text>

        <View className="h-10 w-10" />
      </View>
    </View>
  );
}
