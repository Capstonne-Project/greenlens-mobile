import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export type SubmitStepStatus = 'done' | 'active' | 'pending';

export interface SubmitStep {
  key: string;
  label: string;
  status: SubmitStepStatus;
}

interface SubmitProgressOverlayProps {
  visible: boolean;
  progress: number;
  title: string;
  subtitle?: string;
  steps: SubmitStep[];
}

const RING_SIZE = 168;
const STROKE_WIDTH = 12;

function clamp01(value: number): number {
  'worklet';
  return Math.min(Math.max(value, 0), 1);
}

function CircularProgress({ progress }: { progress: number }) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(clamp01(progress), { duration: 480 });
  }, [animatedProgress, progress]);

  const rightArcStyle = useAnimatedStyle(() => {
    const value = clamp01(animatedProgress.value);
    const deg = -135 + (Math.min(value, 0.5) / 0.5) * 180;
    return { transform: [{ rotateZ: `${deg}deg` }] };
  });

  const leftArcStyle = useAnimatedStyle(() => {
    const value = clamp01(animatedProgress.value);
    const deg = 45 + (Math.max(value - 0.5, 0) / 0.5) * 180;
    return { transform: [{ rotateZ: `${deg}deg` }] };
  });

  const ringBase = {
    position: 'absolute' as const,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: STROKE_WIDTH,
  };

  const coloredArc = {
    ...ringBase,
    borderTopColor: colors.primary,
    borderRightColor: colors.primary,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  };

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ ...ringBase, borderColor: colors.surface }} />

      <View
        style={{ position: 'absolute', left: RING_SIZE / 2, width: RING_SIZE / 2, height: RING_SIZE, overflow: 'hidden' }}
      >
        <Animated.View style={[coloredArc, { left: -RING_SIZE / 2 }, rightArcStyle]} />
      </View>

      <View style={{ position: 'absolute', left: 0, width: RING_SIZE / 2, height: RING_SIZE, overflow: 'hidden' }}>
        <Animated.View style={[coloredArc, { left: 0 }, leftArcStyle]} />
      </View>
    </View>
  );
}

function AnimatedPercent({ progress }: { progress: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const target = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
    const id = setInterval(() => {
      setShown((prev) => {
        if (prev === target) return prev;
        const diff = target - prev;
        const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) / 5));
        const next = prev + step;
        return step > 0 ? Math.min(next, target) : Math.max(next, target);
      });
    }, 24);
    return () => clearInterval(id);
  }, [progress]);

  return (
    <View className="absolute inset-0 items-center justify-center">
      <View className="flex-row items-baseline">
        <Text className="text-[40px] font-extrabold text-textPrimary">{shown}</Text>
        <Text className="ml-0.5 text-base font-bold text-textSecondary">%</Text>
      </View>
    </View>
  );
}

function StepRow({ step }: { step: SubmitStep }) {
  const isDone = step.status === 'done';
  const isActive = step.status === 'active';

  return (
    <View
      className="mb-2.5 flex-row items-center gap-3 rounded-full border bg-white px-4 py-3"
      style={{
        borderColor: isActive ? colors.primaryLight : colors.border,
        opacity: step.status === 'pending' ? 0.5 : 1,
      }}
    >
      {isDone ? (
        <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: colors.primary }}>
          <Ionicons name="checkmark" size={15} color={colors.white} />
        </View>
      ) : isActive ? (
        <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: '#FEF3C7' }}>
          <ActivityIndicator size="small" color={colors.warning} />
        </View>
      ) : (
        <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}>
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.textDisabled }} />
        </View>
      )}

      <Text
        className="text-[15px]"
        style={{
          color: isActive || isDone ? colors.textPrimary : colors.textSecondary,
          fontWeight: isActive ? '700' : '500',
        }}
      >
        {step.label}
      </Text>
    </View>
  );
}

export function SubmitProgressOverlay({ visible, progress, title, subtitle, steps }: SubmitProgressOverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 bg-white px-6">
        <View className="flex-1 items-center justify-center">
          <View style={{ width: RING_SIZE, height: RING_SIZE }}>
            <CircularProgress progress={progress} />
            <AnimatedPercent progress={progress} />
          </View>

          <Text className="mt-7 text-xl font-bold text-textPrimary">{title}</Text>
          {subtitle ? <Text className="mt-1.5 text-sm text-textSecondary">{subtitle}</Text> : null}

          <View className="mt-8 w-full max-w-[360px]">
            {steps.map((step) => (
              <StepRow key={step.key} step={step} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
