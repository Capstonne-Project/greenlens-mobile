import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { notifyLocal } from '@/utils/push-notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  border: string;
  textColor: string;
  iconColor: string;
}

const TOAST_CONFIGS: Record<ToastType, ToastConfig> = {
  success: {
    icon:      'checkmark-circle',
    bg:        '#ECFDF5',
    border:    '#6EE7B7',
    textColor: '#065F46',
    iconColor: colors.primary,
  },
  error: {
    icon:      'close-circle',
    bg:        '#FEF2F2',
    border:    '#FCA5A5',
    textColor: '#991B1B',
    iconColor: '#EF4444',
  },
  warning: {
    icon:      'warning',
    bg:        '#FFFBEB',
    border:    '#FDE68A',
    textColor: '#92400E',
    iconColor: '#F59E0B',
  },
  info: {
    icon:      'information-circle',
    bg:        '#EFF6FF',
    border:    '#BFDBFE',
    textColor: '#1E40AF',
    iconColor: '#3B82F6',
  },
};

// ─── Toast Component ──────────────────────────────────────────────────────────

interface ToastProps {
  visible: boolean;
  type?: ToastType;
  message: string;
  /** ms before auto-hide. Default 2800 */
  duration?: number;
  onHide?: () => void;
}

export function Toast({
  visible,
  type = 'success',
  message,
  duration = 2800,
  onHide,
}: ToastProps) {
  const insets     = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity    = useSharedValue(0);

  const cfg = TOAST_CONFIGS[type];

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity:   opacity.value,
  }));

  useEffect(() => {
    if (visible) {
      // Slide down + fade in, hold, then auto-hide — chained in ONE assignment per
      // shared value. Assigning `.value` twice in the same tick (in → then delayed out)
      // cancels the first animation before it ever runs, so the toast never appears.
      translateY.value = withSequence(
        withSpring(0, { damping: 18, stiffness: 260 }),
        withDelay(
          duration,
          withSpring(-120, { damping: 18, stiffness: 260 }, (finished) => {
            if (finished && onHide) runOnJS(onHide)();
          }),
        ),
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 220 }),
        withDelay(duration, withTiming(0, { duration: 300 })),
      );
    } else {
      translateY.value = withSpring(-120, { damping: 18, stiffness: 260 });
      opacity.value    = withTiming(0, { duration: 200 });
    }
  }, [visible, duration, translateY, opacity, onHide]);

  return (
    <Animated.View
      style={[
        animStyle,
        {
          position:  'absolute',
          top:       insets.top + 12,
          left:      16,
          right:     16,
          zIndex:    9999,
          borderRadius: 16,
          backgroundColor: cfg.bg,
          borderWidth: 1,
          borderColor: cfg.border,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
      ]}
      pointerEvents="none"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
        <Ionicons name={cfg.icon} size={22} color={cfg.iconColor} />
        <Text
          style={{ flex: 1, fontSize: 14, fontWeight: '600', color: cfg.textColor, lineHeight: 20 }}
          numberOfLines={2}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── useToast hook ────────────────────────────────────────────────────────────

interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
}

export function useToast() {
  const [state, setState] = useState<ToastState>({
    visible: false,
    type: 'success',
    message: '',
  });

  /** Báo kết quả hành động bằng banner notification của hệ thống thay vì toast trong app. */
  const show = useCallback((message: string, type: ToastType = 'success') => {
    void notifyLocal(message, type);
  }, []);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return { toastState: state, show, hide };
}
