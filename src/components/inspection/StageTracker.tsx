import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';

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

const STAGE_WIDTH = 72;

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
      style={{ width: STAGE_WIDTH }}
      className="items-center"
    >
      <View
        style={{
          height: 40,
          width: 40,
          borderRadius: 20,
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {stage.status === 'done' ? (
          <Ionicons name="checkmark" size={18} color={colors.white} />
        ) : (
          <Ionicons name={stage.icon} size={16} color={fg} />
        )}
      </View>
      <Text
        className="mt-1.5 text-center text-[10px] font-semibold leading-3"
        numberOfLines={2}
        style={{ color: isActive ? colors.textPrimary : colors.textSecondary }}
      >
        {stage.label}
      </Text>
    </Pressable>
  );
}

/**
 * Rail tiến trình ngang — mỗi stage là 1 node bấm được (nếu không bị khoá);
 * connector giữa các node đổi màu theo tiến độ. Không animation.
 */
export function StageTracker<K extends string>({
  stages,
  activeKey,
  onSelect,
}: StageTrackerProps<K>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'flex-start' }}
    >
      {stages.map((stage, index) => (
        <View key={stage.key} className="flex-row items-start">
          <StageNode stage={stage} isActive={stage.key === activeKey} onPress={() => onSelect(stage.key)} />
          {index < stages.length - 1 ? (
            <View
              style={{
                width: 24,
                height: 2,
                marginTop: 19,
                backgroundColor: stage.status === 'done' ? colors.primary : colors.border,
              }}
            />
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}
