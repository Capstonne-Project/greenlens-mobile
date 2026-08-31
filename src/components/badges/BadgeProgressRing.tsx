import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BadgeProgressRingProps {
  /** 0..1 — bỏ qua nếu badge không có thang đo số (progress = null từ getBadgeProgress). */
  ratio: number;
  size: number;
  children: React.ReactNode;
}

/**
 * Vòng viền mảnh bao quanh icon badge còn khoá — cung xanh dài dần theo % tiến độ thật (từ
 * currentProgressValue/targetProgressValue), để "sắp đạt" và "còn xa" nhìn khác nhau ngay trên
 * lưới huy hiệu thay vì mọi badge khoá đều xám giống hệt nhau.
 */
export function BadgeProgressRing({ ratio, size, children }: BadgeProgressRingProps) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
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
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}
