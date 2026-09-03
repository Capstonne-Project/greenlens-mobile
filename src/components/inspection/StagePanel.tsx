import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface StagePanelProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** Section nội dung cho stage đang active — card phẳng, viền mảnh, tách khỏi nền surface. */
export function StagePanel({ title, description, children }: StagePanelProps) {
  return (
    <View
      className="rounded-3xl bg-white px-4 pb-5 pt-4"
      style={{ borderWidth: 1, borderColor: colors.border }}
    >
      <Text className="text-base font-bold text-textPrimary">{title}</Text>
      {description ? (
        <Text className="mt-1 text-xs leading-[18px] text-textSecondary">{description}</Text>
      ) : null}
      <View className="mt-4">{children}</View>
    </View>
  );
}
