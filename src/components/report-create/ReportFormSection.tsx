import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type ReportFormSectionId =
  | 'images'
  | 'category'
  | 'location'
  | 'description'
  | 'waste'
  | 'privacy';

interface ReportFormSectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  expanded: boolean;
  completed?: boolean;
  optional?: boolean;
  onToggle: () => void;
  children: ReactNode;
}

const OPEN_MS = 260;
const CLOSE_MS = 180;

export function ReportFormSection({
  icon,
  title,
  subtitle,
  expanded,
  completed = false,
  optional = false,
  onToggle,
  children,
}: ReportFormSectionProps) {
  const rotation = useSharedValue(expanded ? 180 : 0);
  const borderProgress = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    rotation.value = withTiming(expanded ? 180 : 0, {
      duration: OPEN_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, rotation]);

  useEffect(() => {
    borderProgress.value = withTiming(completed ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [borderProgress, completed]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      borderProgress.value,
      [0, 1],
      [colors.border, colors.primary],
    ),
    borderWidth: 1.5,
    backgroundColor: colors.white,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06 + borderProgress.value * 0.04,
    shadowRadius: 8,
    elevation: 2,
  }));

  return (
    <Animated.View
      layout={LinearTransition.duration(220).easing(Easing.out(Easing.cubic))}
      className="overflow-hidden rounded-2xl"
      style={cardStyle}
    >
      <TapScale onPress={onToggle}>
        <View className="min-h-[76px] flex-row items-center gap-4 px-5 py-5">
          <Ionicons
            name={icon}
            size={26}
            color={completed ? colors.primary : colors.textSecondary}
          />

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-[17px] font-semibold text-textPrimary">{title}</Text>
              {optional ? (
                <Text className="text-xs text-textDisabled">tuỳ chọn</Text>
              ) : null}
              {completed ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              ) : null}
            </View>
            <Text className="mt-1 text-[15px] text-textSecondary" numberOfLines={2}>
              {subtitle}
            </Text>
          </View>

          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={20} color={colors.textDisabled} />
          </Animated.View>
        </View>
      </TapScale>

      {expanded ? (
        <Animated.View
          entering={FadeInDown.duration(OPEN_MS).easing(Easing.out(Easing.cubic))}
          exiting={FadeOutUp.duration(CLOSE_MS).easing(Easing.in(Easing.cubic))}
          className="border-t px-4 pb-4 pt-3"
          style={{ borderTopColor: completed ? colors.primaryLight : colors.border }}
        >
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
