import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

const THUMB_SIZE = 28;

interface PercentSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** Tiến độ đã lưu — giá trị mới bắt buộc phải LỚN HƠN mốc này, không được bằng. */
  minValue?: number;
  disabled?: boolean;
}

/** Thanh trượt kéo chọn % tiến độ (0–100), snap về bội số 5 khi thả tay. Không cho kéo về bằng hoặc dưới `minValue`. */
export function PercentSlider({ value, onChange, minValue = 0, disabled = false }: PercentSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(value);
  const lastHapticStep = useRef(Math.round(value / 5));
  const savedMark = Math.min(100, Math.max(0, minValue));
  // Sàn thực tế phải > mốc đã lưu — không cho giữ nguyên giá trị cũ.
  const floor = Math.min(100, savedMark + 1);

  const clampedValue = Math.min(100, Math.max(0, value));

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const commitChange = useCallback(
    (percent: number) => {
      const snapped = Math.min(100, Math.max(floor, Math.round(percent / 5) * 5));
      onChange(snapped);
    },
    [onChange, floor],
  );

  const maybeHaptic = useCallback((percent: number) => {
    const step = Math.round(percent / 5);
    if (step !== lastHapticStep.current) {
      lastHapticStep.current = step;
      void Haptics.selectionAsync();
    }
  }, []);

  const pan = Gesture.Pan()
    .enabled(!disabled && trackWidth > 0)
    .onUpdate((e) => {
      const usableWidth = trackWidth - THUMB_SIZE;
      const raw = (e.x / usableWidth) * 100;
      const next = Math.min(100, Math.max(floor, raw));
      progress.value = next;
      runOnJS(maybeHaptic)(next);
    })
    .onEnd(() => {
      progress.value = withSpring(progress.value, { damping: 20, stiffness: 300 });
      runOnJS(commitChange)(progress.value);
    });

  const tap = Gesture.Tap()
    .enabled(!disabled && trackWidth > 0)
    .onEnd((e) => {
      const usableWidth = trackWidth - THUMB_SIZE;
      const raw = (e.x / usableWidth) * 100;
      const next = Math.min(100, Math.max(floor, raw));
      progress.value = withSpring(next, { damping: 20, stiffness: 300 });
      runOnJS(commitChange)(next);
    });

  const composed = Gesture.Race(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const usableWidth = trackWidth - THUMB_SIZE;
    return {
      transform: [{ translateX: (progress.value / 100) * Math.max(0, usableWidth) }],
    };
  });

  return (
    <View>
      <View className="mb-2 flex-row items-end justify-between">
        <Text className="text-4xl font-extrabold" style={{ color: colors.textPrimary }}>
          {clampedValue}%
        </Text>
        <Text className="mb-1.5 text-xs text-textSecondary">
          {savedMark > 0 ? `Đã lưu ${savedMark}% — phải tăng lên` : 'Kéo để điều chỉnh'}
        </Text>
      </View>

      <GestureDetector gesture={composed}>
        <View
          onLayout={handleLayout}
          className="justify-center rounded-full bg-surface"
          style={{ height: THUMB_SIZE, paddingHorizontal: 0 }}
        >
          <View className="absolute h-2 w-full overflow-hidden rounded-full bg-surface" />
          {savedMark > 0 && trackWidth > 0 ? (
            <View
              className="absolute h-2 rounded-full opacity-40"
              style={{
                width: (savedMark / 100) * (trackWidth - THUMB_SIZE) + THUMB_SIZE / 2,
                backgroundColor: colors.textDisabled,
              }}
            />
          ) : null}
          <Animated.View
            className="absolute h-2 rounded-full"
            style={[{ backgroundColor: colors.primary }, fillStyle]}
          />
          <Animated.View
            className="absolute rounded-full border-2 border-white"
            style={[
              {
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                backgroundColor: colors.primary,
                elevation: 3,
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}
