import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
  isLast?: boolean;
  onPress?: () => void;
}

/** Một dòng trong nhóm cài đặt — icon nhỏ gọn, không khoanh tròn màu. */
export function SettingsRow({
  icon,
  label,
  value,
  tone = 'default',
  showChevron = true,
  isLast = false,
  onPress,
}: SettingsRowProps) {
  const color = tone === 'danger' ? colors.error : colors.textPrimary;

  const content = (
    <View
      className="flex-row items-center gap-3 py-3.5"
      style={!isLast ? { borderBottomWidth: 1, borderBottomColor: colors.border } : undefined}
    >
      <Ionicons name={icon} size={18} color={tone === 'danger' ? colors.error : colors.textSecondary} />
      <Text className="flex-1 text-[15px] font-medium" style={{ color }}>
        {label}
      </Text>
      {value ? (
        <Text className="text-[13px] text-textSecondary" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return <Pressable onPress={onPress}>{content}</Pressable>;
}
