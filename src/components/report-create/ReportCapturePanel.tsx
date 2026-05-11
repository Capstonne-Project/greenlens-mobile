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
    <View className="overflow-hidden rounded-3xl border border-border bg-white">
      <View className="bg-primary/10 px-5 pb-5 pt-5">
        <View className="self-start rounded-full bg-white px-3 py-1.5">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-primary">
            Hiện trường
          </Text>
        </View>

        <Text className="mt-4 text-2xl font-bold text-textPrimary">Chụp ảnh ô nhiễm</Text>
        <Text className="mt-2 text-sm leading-6 text-textSecondary">
          Mở camera hệ thống để chụp minh chứng. GreenLens tự gắn GPS và thời gian vào báo cáo.
        </Text>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border bg-white px-3 py-3">
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text className="mt-2 text-sm font-semibold text-textPrimary">Thời gian</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-white px-3 py-3">
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text className="mt-2 text-sm font-semibold text-textPrimary">Vị trí GPS</Text>
          </View>
        </View>
      </View>

      <View className="px-5 pb-5 pt-4">
        <TapScale onPress={onCapturePress} disabled={disabled}>
          <View
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4"
            style={{ opacity: disabled ? 0.6 : 1 }}
          >
            <Ionicons name="camera" size={20} color={colors.white} />
            <Text className="text-base font-semibold text-white">Mở camera để chụp</Text>
          </View>
        </TapScale>
      </View>
    </View>
  );
}
