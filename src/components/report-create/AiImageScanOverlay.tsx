import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface AiImageScanOverlayProps {
  visible: boolean;
  imageUri?: string | null;
  mode?: 'ai' | 'upload';
}

const FRAME_HEIGHT = 280;
const SCAN_BAND = 56;

export function AiImageScanOverlay({
  visible,
  imageUri,
  mode = 'ai',
}: AiImageScanOverlayProps) {
  const [frameWidth, setFrameWidth] = useState(0);
  const scanY = useSharedValue(0);
  const pulse = useSharedValue(0.35);

  useEffect(() => {
    if (!visible || frameWidth <= 0) return;

    const travel = Math.max(FRAME_HEIGHT - SCAN_BAND, 1);
    scanY.value = 0;
    scanY.value = withRepeat(
      withTiming(travel, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );

    pulse.value = withRepeat(
      withTiming(0.75, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [frameWidth, pulse, scanY, visible]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const isAi = mode === 'ai';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full overflow-hidden rounded-3xl bg-white">
          <View className="flex-row items-center gap-2.5 border-b border-border px-4 py-3.5">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Ionicons
                name={isAi ? 'sparkles' : 'cloud-upload-outline'}
                size={18}
                color={colors.primary}
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-textPrimary">
                {isAi ? 'AI đang phân tích ảnh' : 'Đang tải ảnh lên'}
              </Text>
              <Text className="text-xs text-textSecondary">
                {isAi
                  ? 'Đang quét và nhận diện loại ô nhiễm...'
                  : 'Ảnh được tải sớm để gửi báo cáo nhanh hơn.'}
              </Text>
            </View>
          </View>

          <View
            className="relative overflow-hidden bg-black"
            style={{ height: FRAME_HEIGHT }}
            onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-surface">
                <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
              </View>
            )}

            {/* Soft dim so scan line pops */}
            <View className="absolute inset-0 bg-black/20" pointerEvents="none" />

            {/* Corner brackets */}
            <View className="absolute left-3 top-3 h-7 w-7 border-l-2 border-t-2 border-primary" />
            <View className="absolute right-3 top-3 h-7 w-7 border-r-2 border-t-2 border-primary" />
            <View className="absolute bottom-3 left-3 h-7 w-7 border-b-2 border-l-2 border-primary" />
            <View className="absolute bottom-3 right-3 h-7 w-7 border-b-2 border-r-2 border-primary" />

            {frameWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: SCAN_BAND,
                  },
                  scanStyle,
                ]}
              >
                <Animated.View style={[{ flex: 1 }, glowStyle]}>
                  <LinearGradient
                    colors={['transparent', 'rgba(16,185,129,0.18)', 'rgba(16,185,129,0.55)', 'rgba(16,185,129,0.18)', 'transparent']}
                    locations={[0, 0.28, 0.5, 0.72, 1]}
                    style={{ flex: 1 }}
                  />
                </Animated.View>
                <View
                  className="absolute left-0 right-0"
                  style={{
                    top: SCAN_BAND / 2 - 1,
                    height: 2,
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOpacity: 0.9,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 4,
                  }}
                />
              </Animated.View>
            ) : null}
          </View>

          <View className="flex-row items-center justify-center gap-2 px-4 py-3.5">
            <View className="h-1.5 w-1.5 rounded-full bg-primary" />
            <Text className="text-xs font-medium text-textSecondary">
              {isAi ? 'Đang render phân tích…' : 'Đang tải lên kho ảnh…'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
