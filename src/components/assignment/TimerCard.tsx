import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { useDeadlineCountdown, type CountdownParts } from '@/utils/countdown';

export type TimerTone = 'primary' | 'warning' | 'danger' | 'muted' | 'success';

interface TimerCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  deadlineIso: string | null | undefined;
  tone?: TimerTone;
  /** Khi không có deadline — hiện emptyLabel */
  emptyLabel?: string;
  done?: boolean;
  doneLabel?: string;
}

const TONE_MAP: Record<TimerTone, { bg: string; border: string; icon: string; text: string }> = {
  primary: { bg: '#ECFDF5', border: '#A7F3D0', icon: colors.primary, text: colors.primary },
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: colors.warning, text: '#92400E' },
  danger:  { bg: '#FEF2F2', border: '#FECACA', icon: colors.error, text: colors.error },
  muted:   { bg: '#F8FAFC', border: '#E2E8F0', icon: colors.textSecondary, text: colors.textSecondary },
  success: { bg: '#ECFDF5', border: '#A7F3D0', icon: colors.primary, text: '#065F46' },
};

function resolveTone(parts: CountdownParts | null, preferred: TimerTone): TimerTone {
  if (!parts) return preferred;
  if (parts.overdue) return 'danger';
  if (parts.totalMs < 3_600_000) return 'warning'; // < 1h
  return preferred;
}

export function TimerCard({
  icon,
  title,
  subtitle,
  deadlineIso,
  tone = 'primary',
  emptyLabel = '—',
  done = false,
  doneLabel = 'Hoàn tất',
}: TimerCardProps) {
  const parts = useDeadlineCountdown(done ? null : deadlineIso);
  const resolved = done ? 'success' : resolveTone(parts, tone);
  const palette = TONE_MAP[resolved];

  return (
    <View
      className="flex-1 rounded-2xl border px-3 py-3"
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
    >
      <View className="mb-2 flex-row items-center gap-1.5">
        <Ionicons name={done ? 'checkmark-circle' : icon} size={16} color={palette.icon} />
        <Text className="flex-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: palette.text }} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text className="text-lg font-bold" style={{ color: palette.text }} numberOfLines={1}>
        {done ? doneLabel : (parts?.label ?? emptyLabel)}
      </Text>
      {subtitle ? (
        <Text className="mt-1 text-[11px] leading-4 text-textSecondary" numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
