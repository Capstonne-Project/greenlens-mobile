import { TapScale } from '@/components/layout/TapScale';
import { MapReportCalloutCard } from '@/components/map/MapReportCalloutCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MapPinPreviewSheetProps {
  pin: CitizenMapPin | null;
  onClose: () => void;
}

export function MapPinPreviewSheet({ pin, onClose }: MapPinPreviewSheetProps) {
  const insets = useSafeAreaInsets();

  if (!pin) return null;

  return (
    <View className="absolute inset-0 z-30">
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View
        className="rounded-t-3xl bg-white px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="mb-3 items-center">
          <View className="h-1 w-10 rounded-full bg-border" />
        </View>

        <View className="mb-3 overflow-hidden rounded-2xl">
          <MapReportCalloutCard pin={pin} />
        </View>

        <View className="mb-3 flex-row items-center gap-2 rounded-2xl bg-surface px-4 py-3">
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <Text className="flex-1 text-sm text-textSecondary">
            Đăng nhập để xem đầy đủ tiến độ xử lý và lịch sử báo cáo.
          </Text>
        </View>

        <Button
          className="mb-2 h-12 rounded-2xl bg-primary"
          onPress={() => router.push('/(auth)/login' as Href)}
        >
          <Text className="font-semibold text-primary-foreground">Đăng nhập để xem chi tiết</Text>
        </Button>

        <TapScale onPress={onClose}>
          <View className="h-11 items-center justify-center">
            <Text className="text-sm font-semibold text-textSecondary">Đóng</Text>
          </View>
        </TapScale>
      </View>
    </View>
  );
}
