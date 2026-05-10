import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { TapScale } from '@/components/layout/TapScale';

interface MapReportPreviewOverlayProps {
  pin: CitizenMapPin;
  onDismiss: () => void;
  onOpenDetail?: () => void;
}

export function MapReportPreviewOverlay({ pin, onDismiss, onOpenDetail }: MapReportPreviewOverlayProps) {
  return (
    <View className="absolute bottom-[200px] left-4 right-4 z-20">
      <TapScale
        onPress={() => {
          onOpenDetail?.();
        }}
      >
        <View className="overflow-hidden rounded-2xl border border-border bg-white shadow-lg shadow-black/15">
          <View className="relative">
            <Image
              source={{ uri: pin.imageUrl }}
              style={{ width: '100%', height: 140 }}
              contentFit="cover"
            />
            <TapScale onPress={onDismiss}>
              <View className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/40">
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </View>
            </TapScale>
          </View>

          <View className="gap-2 p-4">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="flex-1 text-base font-bold text-textPrimary" numberOfLines={2}>
                {pin.title}
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-primary-light px-2 py-0.5">
                <Ionicons name="people-outline" size={14} color="#059669" />
                <Text className="text-xs font-semibold text-primary-dark">{pin.watchersCount}</Text>
              </View>
            </View>

            <Text className="text-sm leading-5 text-textSecondary" numberOfLines={2}>
              {pin.description}
            </Text>

            <View className="flex-row items-start gap-1">
              <Ionicons name="location-outline" size={14} color="#6B7280" style={{ marginTop: 2 }} />
              <Text className="flex-1 text-xs text-textSecondary">{pin.address}</Text>
            </View>

            <Text className="text-center text-sm font-semibold text-primary">Bấm để xem chi tiết</Text>
          </View>
        </View>
      </TapScale>
    </View>
  );
}
