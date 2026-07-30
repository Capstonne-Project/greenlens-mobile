import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { ChecklistCategoryState } from '@/utils/inspection-checklist';

interface ChecklistCategoryRowProps {
  state: ChecklistCategoryState;
  /** Khoá tương tác khi hồ sơ đã chốt biên bản. */
  disabled?: boolean;
  onPress: (state: ChecklistCategoryState) => void;
}

/** Một dòng checklist — trạng thái đạt/thiếu thay cho progress bar (BR-INS-033). */
export function ChecklistCategoryRow({
  state,
  disabled = false,
  onPress,
}: ChecklistCategoryRowProps) {
  const isMissing = state.required && !state.satisfied;
  const count = state.files.length;
  const detail = state.note?.trim()
    ? state.note.trim()
    : count > 0
      ? `${count} tệp đã tải lên`
      : state.hint;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={state.label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(state)}
      className="mb-2 flex-row items-center gap-3 rounded-xl px-3.5 py-3"
      style={{
        backgroundColor: isMissing ? '#FFFBEB' : colors.surface,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Ionicons
        name={state.satisfied ? 'checkmark-circle' : state.icon}
        size={20}
        color={state.satisfied ? colors.primary : isMissing ? colors.warning : colors.textSecondary}
      />

      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-bold text-textPrimary">{state.label}</Text>
          {state.required ? (
            <Text className="text-xs font-bold" style={{ color: colors.error }}>
              *
            </Text>
          ) : null}
        </View>
        <Text className="mt-0.5 text-xs leading-4 text-textSecondary" numberOfLines={1}>
          {detail}
        </Text>
      </View>

      {!disabled ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
      ) : null}
    </Pressable>
  );
}
