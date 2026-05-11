import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import { colors } from '@/theme/colors';

interface ReportCapturePanelProps {
  disabled?: boolean;
  onCapturePress: () => void;
}

export function ReportCapturePanel({ disabled = false, onCapturePress }: ReportCapturePanelProps) {
  return (
    <View className="gap-3">
      <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">
        Hiện trường
      </Text>

      <TapScale onPress={onCapturePress} disabled={disabled}>
        <View
          className="items-center justify-center rounded-3xl border border-dashed border-primary/35 bg-primary/5 py-12"
          style={{ opacity: disabled ? 0.6 : 1 }}
        >
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primary shadow-sm">
            <Ionicons name="camera" size={34} color={colors.white} />
          </View>
        </View>
      </TapScale>
    </View>
  );
}
