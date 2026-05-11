import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface ReportSectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ReportSectionCard({ title, description, children }: ReportSectionCardProps) {
  return (
    <View className="rounded-3xl border border-border bg-white p-4">
      <Text className="text-base font-bold text-textPrimary">{title}</Text>
      {description ? (
        <Text className="mt-1 text-sm text-textSecondary">{description}</Text>
      ) : null}
      <View className="mt-4">{children}</View>
    </View>
  );
}
