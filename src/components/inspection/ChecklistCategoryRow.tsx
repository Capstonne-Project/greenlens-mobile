import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { ChecklistCategoryState } from '@/utils/inspection-checklist';

interface ChecklistCategoryRowProps {
  state: ChecklistCategoryState;
  /** Khoá tương tác khi hồ sơ đã chốt biên bản. */
  disabled?: boolean;
  /** Đang mở rộng — hiện `children` ngay dưới dòng, không mở dialog riêng. */
  isExpanded?: boolean;
  onPress: (state: ChecklistCategoryState) => void;
  children?: ReactNode;
}

/**
 * Một dòng checklist — trạng thái đạt/thiếu thay cho progress bar (BR-INS-033).
 * Bấm vào dòng sẽ giãn ra tại chỗ để điền/tải file, không mở modal.
 */
export function ChecklistCategoryRow({
  state,
  disabled = false,
  isExpanded = false,
  onPress,
  children,
}: ChecklistCategoryRowProps) {
  const isMissing = state.required && !state.satisfied;
  const count = state.files.length;
  const detail = state.note?.trim()
    ? state.note.trim()
    : count > 0
      ? `${count} tệp đã tải lên`
      : state.hint;

  return (
    <View className="mb-2 overflow-hidden rounded-xl" style={{ backgroundColor: isMissing ? '#FFFBEB' : colors.surface }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.label}
        accessibilityState={{ disabled, expanded: isExpanded }}
        disabled={disabled}
        onPress={() => onPress(state)}
        className="flex-row items-center gap-3 px-3.5 py-3"
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
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textDisabled}
          />
        ) : null}
      </Pressable>

      {isExpanded && children ? (
        <View className="border-t px-3.5 pb-3.5 pt-3" style={{ borderTopColor: colors.border }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
