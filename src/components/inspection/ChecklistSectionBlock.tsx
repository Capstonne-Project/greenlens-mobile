import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { ChecklistCategoryState } from '@/utils/inspection-checklist';

interface ChecklistSectionBlockProps {
  numeral: string;
  state: ChecklistCategoryState;
  children: ReactNode;
}

/**
 * Một mục của biên bản — luôn hiển thị đầy đủ (không accordion), đánh số La Mã
 * như văn bản biên bản thật. Thay `ChecklistCategoryRow` trong màn checklist.
 */
export function ChecklistSectionBlock({ numeral, state, children }: ChecklistSectionBlockProps) {
  const isMissing = state.required && !state.satisfied;

  return (
    <View className="mb-5">
      <View className="mb-2.5 flex-row items-center gap-2">
        <Text className="text-sm font-extrabold text-textPrimary">
          {numeral}. {state.label}
        </Text>
        {state.required ? (
          <Text className="text-xs font-bold" style={{ color: colors.error }}>
            *
          </Text>
        ) : null}
        <View className="flex-1" />
        <Ionicons
          name={state.satisfied ? 'checkmark-circle' : isMissing ? 'alert-circle' : 'ellipse-outline'}
          size={16}
          color={state.satisfied ? colors.primary : isMissing ? colors.warning : colors.textDisabled}
        />
      </View>
      {children}
    </View>
  );
}
