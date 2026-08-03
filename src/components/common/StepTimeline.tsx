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

interface StepTimelineNodeProps {
  stepNumber: number;
  title: string;
  completed: boolean;
  active: boolean;
  isLast: boolean;
  /** 0–100: mức lấp đầy của đoạn nối phía dưới node này — cho phép "chạy" dần thay vì bật/tắt. */
  connectorFill: number;
  onPress: () => void;
  children: ReactNode;
}

function StepTimelineNode({
  stepNumber,
  title,
  completed,
  active,
  isLast,
  connectorFill,
  onPress,
  children,
}: StepTimelineNodeProps) {
  const dim = useSharedValue(active ? 1 : 0.55);
  const fill = useSharedValue(0);

  useEffect(() => {
    dim.value = withTiming(active ? 1 : 0.55, { duration: 220 });
  }, [active, dim]);

  useEffect(() => {
    fill.value = withTiming(connectorFill, { duration: 600 });
  }, [connectorFill, fill]);

  const bodyStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const fillStyle = useAnimatedStyle(() => ({ height: `${fill.value}%` }));

  const dotColor = completed ? colors.primary : active ? colors.primary : colors.border;
  const dotBg = completed ? colors.primary : active ? '#fff' : colors.surface;

  return (
    <View className="flex-row">
      <View className="items-center" style={{ width: 28 }}>
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: 26,
            height: 26,
            backgroundColor: dotBg,
            borderWidth: 2,
            borderColor: dotColor,
          }}
        >
          {completed ? (
            <Ionicons name="checkmark" size={14} color="#fff" style={{ backgroundColor: colors.primary, borderRadius: 8 }} />
          ) : (
            <Text className="text-xs font-extrabold" style={{ color: active ? colors.primary : colors.textDisabled }}>
              {stepNumber}
            </Text>
          )}
        </View>
        {!isLast ? (
          <View className="flex-1 overflow-hidden" style={{ width: 3, marginVertical: 6, backgroundColor: colors.border, borderRadius: 1.5 }}>
            <Animated.View
              style={[{ width: '100%', backgroundColor: colors.primary, borderRadius: 1.5 }, fillStyle]}
            />
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: active }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        className="flex-1 pb-9"
        style={{ marginLeft: 14 }}
      >
        <Text
          className="pt-0.5 text-base font-bold"
          style={{ color: active ? colors.textPrimary : colors.textSecondary }}
        >
          {title}
        </Text>

        {active ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={bodyStyle} className="mt-3">
            {children}
          </Animated.View>
        ) : null}
      </Pressable>
    </View>
  );
}

interface StepTimelineStep {
  key: string;
  stepNumber: number;
  title: string;
  completed: boolean;
  /** 0–100: tiến độ riêng của bước này (mặc định 100 nếu completed, 0 nếu chưa) — dùng cho step đang chạy dở. */
  progress?: number;
  content: ReactNode;
}

interface StepTimelineProps {
  steps: StepTimelineStep[];
  activeKey: string;
  onSelect: (key: string) => void;
}

/** Timeline dọc dạng chấm-nối cho các bước tuần tự, connector "chạy" dần theo tiến độ. */
export function StepTimeline({ steps, activeKey, onSelect }: StepTimelineProps) {
  return (
    <View>
      {steps.map((step, index) => {
        const connectorFill = step.completed ? 100 : (step.progress ?? 0);
        return (
          <StepTimelineNode
            key={step.key}
            stepNumber={step.stepNumber}
            title={step.title}
            completed={step.completed}
            active={step.key === activeKey}
            isLast={index === steps.length - 1}
            connectorFill={connectorFill}
            onPress={() => onSelect(step.key)}
          >
            {step.content}
          </StepTimelineNode>
        );
      })}
    </View>
  );
}
