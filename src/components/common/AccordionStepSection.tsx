import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface AccordionStepSectionProps {
  stepNumber: number;
  title: string;
  completed: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Bước dạng accordion — chỉ 1 bước mở tại 1 thời điểm, các bước khác mờ đi và thu gọn. */
export function AccordionStepSection({
  stepNumber,
  title,
  completed,
  expanded,
  onToggle,
  children,
}: AccordionStepSectionProps) {
  const rotation = useSharedValue(expanded ? 1 : 0);
  const dim = useSharedValue(expanded ? 1 : 0.55);

  useEffect(() => {
    rotation.value = withTiming(expanded ? 1 : 0, { duration: 220 });
    dim.value = withTiming(expanded ? 1 : 0.55, { duration: 220 });
  }, [expanded, rotation, dim]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));
  const containerStyle = useAnimatedStyle(() => ({
    opacity: dim.value,
  }));

  return (
    <Animated.View
      style={containerStyle}
      className="mb-3 overflow-hidden rounded-2xl border border-border bg-white"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        className="flex-row items-center justify-between px-4 py-3.5"
      >
        <View className="flex-1 flex-row items-center gap-2">
          {completed ? (
            <Ionicons name="checkmark-circle" size={19} color={colors.primary} />
          ) : (
            <Text
              className="text-sm font-extrabold"
              style={{ color: expanded ? colors.primary : colors.textDisabled }}
            >
              {stepNumber}.
            </Text>
          )}
          <Text
            className="flex-1 text-base font-bold"
            style={{ color: expanded ? colors.textPrimary : colors.textSecondary }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {expanded ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} className="px-4 pb-4">
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
