import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { isVideoCompressionAvailable } from '@/utils/compress-video';

const SIZE = 84;

export type EvidenceThumbKind = 'image' | 'video' | 'audio' | 'file';

interface EvidenceThumbProps {
  kind: EvidenceThumbKind;
  uri: string;
  /** Nhãn phụ dưới icon — thời lượng cho video/audio, tên tệp cho file khác. */
  caption?: string | null;
  onPress?: () => void;
}

/** Poster frame cho video — `createVideoThumbnail` là native, không có trong Expo Go. */
function useVideoThumbnail(uri: string, enabled: boolean): string | null {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isVideoCompressionAvailable) return;

    let cancelled = false;
    void (async () => {
      try {
        const { createVideoThumbnail } = await import('react-native-compressor');
        const result = await createVideoThumbnail(uri);
        if (!cancelled) setThumbnail(result.path);
      } catch {
        // Không có poster thì rơi về icon — không chặn người dùng xem video.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri, enabled]);

  return thumbnail;
}

/**
 * Ô bằng chứng 84x84 dùng chung cho mọi category — ảnh hiện trực tiếp,
 * video hiện poster + nút play, audio/tệp hiện icon. Tap để mở xem lại.
 */
export function EvidenceThumb({ kind, uri, caption, onPress }: EvidenceThumbProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const thumbnail = useVideoThumbnail(uri, kind === 'video');

  const preview = kind === 'image' ? uri : thumbnail;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={!onPress}
        onPressIn={() => {
          scale.value = withSpring(0.94, { damping: 14, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 300 });
        }}
        className="overflow-hidden rounded-xl bg-surface"
        style={{ width: SIZE, height: SIZE }}
      >
        {preview ? (
          <Image
            source={{ uri: preview }}
            style={{ width: SIZE, height: SIZE }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons
              name={
                kind === 'video'
                  ? 'videocam'
                  : kind === 'audio'
                    ? 'musical-notes'
                    : 'document-text'
              }
              size={22}
              color={colors.textSecondary}
            />
          </View>
        )}

        {/* Lớp phủ play — báo hiệu media xem được, không phải ảnh tĩnh. */}
        {kind === 'video' || kind === 'audio' ? (
          <View className="absolute inset-0 items-center justify-center">
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            >
              <Ionicons name="play" size={16} color={colors.white} />
            </View>
          </View>
        ) : null}

        {caption ? (
          <View
            className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          >
            <Text className="text-[10px] font-semibold text-white" numberOfLines={1}>
              {caption}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
