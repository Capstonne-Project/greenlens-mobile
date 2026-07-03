import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';

interface ReportMediaItem {
  url: string;
  mimeType?: string;
}

interface ReportMediaGalleryProps {
  media: ReportMediaItem[];
  heroIndex?: number;
  onSelectIndex?: (index: number) => void;
  heroHeight?: number;
}

export function ReportMediaGallery({
  media,
  heroIndex = 0,
  onSelectIndex,
  heroHeight = 240,
}: ReportMediaGalleryProps) {
  if (media.length === 0) return null;

  const heroUrl = media[heroIndex]?.url ?? media[0]?.url;

  return (
    <View>
      {heroUrl ? (
        <Image source={{ uri: heroUrl }} style={{ width: '100%', height: heroHeight }} contentFit="cover" />
      ) : null}
      {media.length > 1 && onSelectIndex ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3">
          {media.map((item, index) => (
            <Pressable key={`${item.url}-${index}`} onPress={() => onSelectIndex(index)} className="mr-2">
              <Image
                source={{ uri: item.url }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  borderWidth: heroIndex === index ? 2 : 0,
                  borderColor: '#10B981',
                }}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
