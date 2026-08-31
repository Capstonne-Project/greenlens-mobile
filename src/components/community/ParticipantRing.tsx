import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ParticipantRingProps {
  /** Số người đã tham gia. */
  count: number;
  /** Sức chứa tối đa. */
  capacity: number;
  size?: number;
}

/**
 * Vòng tròn "mọc dần" thay progress bar thẳng — mỗi người tham gia là một cung lá xanh khép
 * dần quanh vòng, khớp hình ảnh "cộng đồng cùng góp sức" hơn một thanh % vô cảm.
 */
export function ParticipantRing({ count, capacity, size = 96 }: ParticipantRingProps) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = capacity > 0 ? Math.min(1, count / capacity) : 0;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(15, 27, 20, 0.10)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primaryDark}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.displayBlack, fontSize: 22, color: colors.textPrimary }}>{count}</Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: 9.5, color: 'rgba(15,27,20,0.45)', letterSpacing: 0.3 }}>
          /{capacity}
        </Text>
      </View>
    </View>
  );
}
