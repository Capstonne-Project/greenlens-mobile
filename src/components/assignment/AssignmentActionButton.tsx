import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface AssignmentActionButtonProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  compact?: boolean;
  children?: ReactNode;
}

const VARIANT_STYLE = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    textColor: colors.white,
  },
  secondary: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    textColor: colors.textPrimary,
  },
  quiet: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
    textColor: colors.textSecondary,
  },
  danger: {
    backgroundColor: colors.white,
    borderColor: colors.error,
    textColor: colors.error,
  },
} as const;

export function AssignmentActionButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  loadingLabel,
  compact = false,
}: AssignmentActionButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const palette = VARIANT_STYLE[variant];
  const unavailable = disabled || loading;
  const contentColor = unavailable ? colors.textDisabled : palette.textColor;

  return (
    <Animated.View style={[animatedStyle, { alignSelf: 'stretch' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: unavailable, busy: loading }}
        onPress={onPress}
        disabled={unavailable}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        }}
        className="flex-row items-center justify-center gap-2 rounded-xl border"
        style={{
          width: '100%',
          minHeight: compact ? 44 : 52,
          backgroundColor: unavailable ? colors.surface : palette.backgroundColor,
          borderColor: unavailable ? colors.border : palette.borderColor,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={contentColor} />
        ) : icon ? (
          <Ionicons name={icon} size={compact ? 17 : 19} color={contentColor} />
        ) : null}
        <Text
          className={compact ? 'text-sm font-semibold' : 'text-base font-bold'}
          style={{ color: contentColor }}
        >
          {loading ? (loadingLabel ?? label) : label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
