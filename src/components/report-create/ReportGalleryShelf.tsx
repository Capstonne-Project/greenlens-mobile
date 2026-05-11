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
  onRemoveItem?: (uri: string) => void;
}

export function ReportGalleryShelf({ items, onOpenLibrary, onRemoveItem }: ReportGalleryShelfProps) {
  return (
    <View className="gap-3">
      <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">
        Ảnh từ thư viện
      </Text>

      <TapScale onPress={onOpenLibrary}>
        <View className="flex-row items-center justify-between rounded-3xl border border-border bg-white px-4 py-4">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Ionicons name="images-outline" size={22} color={colors.primary} />
            </View>
            <Text className="text-base font-semibold text-textPrimary">Chọn ảnh</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
        </View>
      </TapScale>

      {items.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {items.map((item, index) => (
            <View key={item.id} className="overflow-hidden rounded-2xl border border-border">
              <Image source={{ uri: item.uri }} style={{ width: 88, height: 88 }} contentFit="cover" />
              <View className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-white">{index + 1}</Text>
              </View>
              {onRemoveItem ? (
                <View className="absolute right-1.5 top-1.5">
                  <TapScale onPress={() => onRemoveItem(item.uri)}>
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-black/55">
                      <Ionicons name="close" size={14} color={colors.white} />
                    </View>
                  </TapScale>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
