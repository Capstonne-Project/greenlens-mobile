import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import type { CitizenMapPin } from '@/data/citizen-map-mock';

interface MapReportCalloutCardProps {
  pin: CitizenMapPin;
}

/** Nội dung callout gắn marker — ảnh, tiêu đề, reporterCount, mô tả, địa chỉ */
export function MapReportCalloutCard({ pin }: MapReportCalloutCardProps) {
  return (
    <View className="w-[300px] overflow-hidden rounded-2xl border border-border bg-white shadow-lg shadow-black/15">
      <Image
        source={{ uri: pin.imageUrl }}
        style={{ width: '100%', height: 152 }}
        contentFit="cover"
      />

      <View className="gap-2.5 p-4">
        <View className="flex-row items-start gap-2">
          <Text className="flex-1 text-base font-bold uppercase leading-5 text-textPrimary" numberOfLines={2}>
            {pin.title}
          </Text>
          <View className="flex-row items-center gap-1 rounded-full bg-primary-light px-2.5 py-1">
            <Text className="text-xs font-bold text-primary-dark">{pin.watchersCount}</Text>
            <Ionicons name="people-outline" size={14} color="#059669" />
          </View>
        </View>

        <Text className="text-sm leading-5 text-textSecondary" numberOfLines={2}>
          {pin.description}
        </Text>

        <View className="flex-row items-end justify-between gap-3 pt-0.5">
          <Text className="flex-1 text-xs leading-4 text-textSecondary" numberOfLines={2}>
            {pin.address}
          </Text>
          <Text className="text-xs font-medium text-textSecondary">Bấm để xem chi tiết</Text>
        </View>
      </View>
    </View>
  );
}
