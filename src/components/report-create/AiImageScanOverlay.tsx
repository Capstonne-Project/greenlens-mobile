import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface AiImageScanOverlayProps {
  visible: boolean;
  imageUri?: string | null;
  mode?: 'ai' | 'upload';
}

const FRAME_HEIGHT = 300;

export function AiImageScanOverlay({
  visible,
  imageUri,
  mode = 'ai',
}: AiImageScanOverlayProps) {
  const scan = useSharedValue(0);
  const enter = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      enter.value = 0;
      return;
    }
    enter.value = withSpring(1, { damping: 16, stiffness: 140 });
  }, [enter, visible]);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(scan);
      scan.value = 0;
      return;
    }

    // Quét một chiều trên → dưới, tốc độ đều, lặp vô hạn.
    // Chỉ phụ thuộc `visible` — nếu phụ thuộc frameWidth thì onLayout bắn
    // liên tục lúc card vào màn sẽ reset animation, gây nhảy lên nhảy xuống.
    scan.value = 0;
    scan.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.linear }),
      -1,
      false,
    );
  }, [scan, visible]);

  // Modal tự lo fade → không animate opacity ở đây (hai lớp fade chồng nhau
  // là nguyên nhân của cú "chớp" mỗi lần overlay bật/tắt).
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(enter.value, [0, 1], [0.92, 1]) },
      { translateY: interpolate(enter.value, [0, 1], [20, 0]) },
    ],
  }));

  // Vạch quét nằm ở đáy container (cao 64px, đặt top: -64) nên phải chạy hết
  // FRAME_HEIGHT + 64 thì vệt sáng mới thoát khỏi khung.
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scan.value, [0, 1], [0, FRAME_HEIGHT + 64]) },
    ],
  }));

  const isAi = mode === 'ai';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 items-center justify-center px-6">
        {/* Nền phía sau mờ đen, dialog phía trước nền trắng */}
        <View className="absolute inset-0 bg-black/60" />

        <Animated.View
          style={[styles.card, cardStyle]}
          className="w-full overflow-hidden rounded-3xl"
        >
          <View className="flex-row items-center gap-3 border-b border-border px-4 pb-3.5 pt-4">
            <Ionicons
              name={isAi ? 'scan-outline' : 'cloud-upload-outline'}
              size={22}
              color={colors.primary}
            />
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-textPrimary">
                {isAi ? 'AI đang phân tích ảnh' : 'Đang tải ảnh lên'}
              </Text>
              <Text className="mt-0.5 text-xs text-textSecondary">
                {isAi
                  ? 'Nhận diện loại và mức độ ô nhiễm…'
                  : 'Ảnh được tải sớm để gửi báo cáo nhanh hơn.'}
              </Text>
            </View>
          </View>

          <View className="px-3 pt-3">
            <View
              className="relative rounded-2xl"
              style={{
                height: FRAME_HEIGHT,
                backgroundColor: colors.surface,
                overflow: 'hidden',
              }}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="image-outline" size={40} color={colors.textDisabled} />
                </View>
              )}

              {/* Đường quét mảnh + vệt sáng ngắn phía sau */}
              <Animated.View
                pointerEvents="none"
                style={[styles.scanLine, scanLineStyle]}
              >
                <LinearGradient
                  colors={['rgba(16,185,129,0)', 'rgba(16,185,129,0.38)']}
                  style={styles.scanTrail}
                />
                <View style={styles.scanEdge} />
              </Animated.View>

              <CornerBracket corner="tl" />
              <CornerBracket corner="tr" />
              <CornerBracket corner="bl" />
              <CornerBracket corner="br" />
            </View>
          </View>

          <View className="px-4 pb-4 pt-3">
            <ProgressRail />
            <Text className="mt-2.5 text-center text-xs text-textSecondary">
              {isAi ? 'Đang dựng kết quả phân tích…' : 'Đang tải lên kho ảnh…'}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ProgressRail() {
  const slide = useSharedValue(0);

  useEffect(() => {
    slide.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.linear }),
      -1,
      false,
    );
  }, [slide]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: `${interpolate(slide.value, [0, 1], [-100, 200])}%` }],
  }));

  return (
    <View style={styles.rail}>
      <Animated.View style={[styles.railThumb, style]}>
        <LinearGradient
          colors={['transparent', colors.primary, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

function CornerBracket({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const position = {
    tl: { left: 10, top: 10 },
    tr: { right: 10, top: 10 },
    bl: { left: 10, bottom: 10 },
    br: { right: 10, bottom: 10 },
  }[corner];

  const edge = {
    tl: { borderLeftWidth: 2, borderTopWidth: 2, borderTopLeftRadius: 8 },
    tr: { borderRightWidth: 2, borderTopWidth: 2, borderTopRightRadius: 8 },
    bl: { borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: 8 },
    br: { borderRightWidth: 2, borderBottomWidth: 2, borderBottomRightRadius: 8 },
  }[corner];

  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          height: 26,
          width: 26,
          borderColor: colors.primary,
        },
        position,
        edge,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 20,
  },
  // Container cao 64px: vệt sáng chiếm toàn bộ, vạch quét nằm ở ĐÁY.
  // Khi container trượt xuống, vệt sáng kéo phía sau đúng hướng đi.
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -64,
    height: 64,
  },
  scanTrail: {
    ...StyleSheet.absoluteFillObject,
  },
  scanEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    // Nền sáng nên vạch quét dùng primary đặc thay vì mint nhạt
    backgroundColor: colors.primary,
  },
  rail: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  railThumb: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
});
