import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface StagePanelProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** Section nội dung cho stage đang active trong StageTracker — không card/shadow. */
export function StagePanel({ title, description, children }: StagePanelProps) {
  return (
    <View className="border-t border-border pt-4" style={{ borderTopColor: colors.border }}>
      <Text className="text-base font-bold text-textPrimary">{title}</Text>
      {description ? (
        <Text className="mt-1 text-xs leading-[18px] text-textSecondary">{description}</Text>
      ) : null}
      <View className="mt-4">{children}</View>
    </View>
  );
}
