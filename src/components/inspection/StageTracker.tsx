import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

export type StageStatus = 'done' | 'active' | 'locked' | 'pending';

export interface StageDef<K extends string> {
  key: K;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: StageStatus;
}

interface StageTrackerProps<K extends string> {
  stages: readonly StageDef<K>[];
  activeKey: K;
  onSelect: (key: K) => void;
}

const NODE_SIZE = 30;

function StageNode<K extends string>({
  stage,
  isActive,
  onPress,
}: {
  stage: StageDef<K>;
  isActive: boolean;
  onPress: () => void;
}) {
  const isLocked = stage.status === 'locked';
  const bg = stage.status === 'done' || isActive ? colors.primary : isLocked ? colors.surface : colors.white;
  const fg = stage.status === 'done' || isActive ? colors.white : isLocked ? colors.textDisabled : colors.textSecondary;
  const border = isActive ? colors.primary : colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={stage.label}
      accessibilityState={{ selected: isActive, disabled: isLocked }}
      disabled={isLocked}
      onPress={onPress}
      className="items-center"
      style={{ width: 56 }}
    >
      <View
        style={{
          height: NODE_SIZE,
          width: NODE_SIZE,
          borderRadius: NODE_SIZE / 2,
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {stage.status === 'done' ? (
          <Ionicons name="checkmark" size={14} color={colors.white} />
        ) : (
          <Ionicons name={stage.icon} size={13} color={fg} />
        )}
      </View>
      <Text
        className="mt-1 text-center text-[9px] font-semibold leading-3"
        numberOfLines={1}
        style={{ color: isActive ? colors.textPrimary : colors.textSecondary }}
      >
        {stage.label}
      </Text>
    </Pressable>
  );
}

/**
 * Đường nối giữa 2 node.
 * - `filled`: nền fill màu chạy dần từ trái sang phải khi stage trước "done".
 * - `leadsToActive`: chấm sáng chạy lặp dọc connector dẫn tới stage đang xem,
 *   để mắt luôn thấy có chuyển động thay vì đứng yên.
 */
function StageConnector({ filled, leadsToActive }: { filled: boolean; leadsToActive: boolean }) {
  const progress = useRef(new Animated.Value(filled ? 1 : 0)).current;
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: filled ? 1 : 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [filled, progress]);

  useEffect(() => {
    if (!leadsToActive) {
      travel.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.timing(travel, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [leadsToActive, travel]);

  return (
    <View
      className="flex-1"
      style={{ height: 2, marginTop: NODE_SIZE / 2, backgroundColor: colors.border, overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          height: '100%',
          backgroundColor: colors.primary,
          width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
      {leadsToActive ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            height: '100%',
            width: 14,
            borderRadius: 1,
            backgroundColor: colors.primary,
            opacity: 0.55,
            transform: [
              {
                translateX: travel.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-14, 72],
                }),
              },
            ],
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * Rail tiến trình ngang — 5 stage nằm gọn một hàng (không scroll). Connector
 * giữa các node fill màu chạy dần khi stage trước chuyển sang "done".
 */
export function StageTracker<K extends string>({
  stages,
  activeKey,
  onSelect,
}: StageTrackerProps<K>) {
  return (
    <View className="flex-row items-start justify-center px-2">
      {stages.map((stage, index) => (
        <View key={stage.key} className="flex-row items-start" style={index === 0 ? undefined : { flex: 1, maxWidth: 72 }}>
          {index > 0 ? (
            <StageConnector
              filled={stages[index - 1].status === 'done'}
              leadsToActive={stage.key === activeKey && stages[index - 1].status === 'done'}
            />
          ) : null}
          <StageNode stage={stage} isActive={stage.key === activeKey} onPress={() => onSelect(stage.key)} />
        </View>
      ))}
    </View>
  );
}
