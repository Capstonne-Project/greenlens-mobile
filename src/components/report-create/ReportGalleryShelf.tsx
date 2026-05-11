import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScrollView, Text, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import { colors } from '@/theme/colors';

interface GalleryPreviewItem {
  id: string;
  uri: string;
}

interface ReportGalleryShelfProps {
  items: GalleryPreviewItem[];
  onOpenLibrary: () => void;
}

export function ReportGalleryShelf({ items, onOpenLibrary }: ReportGalleryShelfProps) {
  return (
    <View className="mt-4 rounded-3xl border border-border bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-textPrimary">Ảnh từ thư viện</Text>
          <Text className="mt-1 text-sm text-textSecondary">
            Chọn tối đa 5 ảnh, sau đó xác nhận địa chỉ trên bản đồ.
          </Text>
        </View>
        <TapScale onPress={onOpenLibrary}>
          <View className="rounded-full bg-primary/10 px-3 py-2">
            <Text className="text-xs font-semibold text-primary">Chọn</Text>
          </View>
        </TapScale>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, gap: 12 }}
      >
        {items.length === 0 ? (
          <TapScale onPress={onOpenLibrary}>
            <View className="h-24 w-40 items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/5">
              <Ionicons name="images-outline" size={24} color={colors.primary} />
              <Text className="mt-2 text-xs font-semibold text-primary">Mở thư viện</Text>
            </View>
          </TapScale>
        ) : (
          items.map((item, index) => (
            <View key={item.id} className="overflow-hidden rounded-2xl border border-border">
              <Image
                source={{ uri: item.uri }}
                style={{ width: 96, height: 96 }}
                contentFit="cover"
              />
              <View className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-white">{index + 1}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TapScale onPress={onOpenLibrary}>
        <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
              <Ionicons name="map-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text className="font-semibold text-textPrimary">Chọn ảnh đã lưu</Text>
              <Text className="mt-0.5 text-xs text-textSecondary">Tiếp tục sang bước địa chỉ</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </TapScale>
    </View>
  );
}
