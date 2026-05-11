import { Image } from 'expo-image';
import { ScrollView, Text, View } from 'react-native';
import type { ReportImageDraft } from '@/types/pollution-report.types';

interface ReportDraftImageStripProps {
  images: ReportImageDraft[];
}

export function ReportDraftImageStrip({ images }: ReportDraftImageStripProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12 }}
    >
      {images.map((item) => (
        <View key={item.localUri} className="overflow-hidden rounded-2xl border border-border">
          <Image
            source={{ uri: item.localUri }}
            style={{ width: 112, height: 112 }}
            contentFit="cover"
          />
          <View className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5">
            <Text className="text-[10px] font-medium text-white">
              {item.uploadStatus === 'done'
                ? 'Đã tải'
                : item.uploadStatus === 'uploading'
                  ? 'Đang tải'
                  : item.uploadStatus === 'error'
                    ? 'Lỗi'
                    : 'Chờ tải'}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
