import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReportFormSubmitBarProps {
  label?: string;
  disabled?: boolean;
  isBusy?: boolean;
  onSubmit: () => void;
}

export function ReportFormSubmitBar({
  label = 'Gửi báo cáo',
  disabled = false,
  isBusy = false,
  onSubmit,
}: ReportFormSubmitBarProps) {
  const insets = useSafeAreaInsets();
  const isDisabled = disabled || isBusy;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-surface px-4 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 14) }}
    >
      <TapScale onPress={onSubmit} disabled={isDisabled}>
        <View
          className={`h-14 flex-row items-center justify-center gap-2 rounded-full ${
            isDisabled ? 'bg-border' : 'bg-primary'
          }`}
        >
          {isBusy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={isDisabled ? colors.textDisabled : colors.white}
            />
          )}
          <Text
            className={`text-base font-bold ${
              isDisabled ? 'text-textDisabled' : 'text-white'
            }`}
          >
            {isBusy ? 'Đang xử lý...' : label}
          </Text>
        </View>
      </TapScale>
    </View>
  );
}
