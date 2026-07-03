import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/theme/colors';

interface SlaCountdownProps {
  dueAt: string | null | undefined;
  prefix?: string;
}

function formatRemaining(dueAt: string): { text: string; overdue: boolean } {
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff <= 0) {
    const over = Math.abs(diff);
    const h = Math.floor(over / 3_600_000);
    const m = Math.floor((over % 3_600_000) / 60_000);
    return { text: `Quá ${h > 0 ? `${h}h ` : ''}${m}m`, overdue: true };
  }
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return { text: `${h}h ${m}m`, overdue: false };
}

export function SlaCountdown({ dueAt, prefix = 'SLA' }: SlaCountdownProps) {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!dueAt) return;
    const id = setInterval(() => tick((v) => v + 1), 60_000);
    return () => clearInterval(id);
  }, [dueAt]);

  const sla = useMemo(() => (dueAt ? formatRemaining(dueAt) : null), [dueAt, tick]);

  if (!sla) return null;

  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name="time-outline" size={14} color={sla.overdue ? colors.error : colors.warning} />
      <Text className="text-xs font-bold" style={{ color: sla.overdue ? colors.error : colors.warning }}>
        {prefix} {sla.text}
      </Text>
    </View>
  );
}
