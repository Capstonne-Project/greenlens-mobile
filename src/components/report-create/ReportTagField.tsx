import { Ionicons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface ReportTagFieldProps {
  tags: string[];
  value: string;
  onChangeText: (value: string) => void;
  onAdd: () => void;
  onRemove: (tag: string) => void;
}

export function ReportTagField({ tags, value, onChangeText, onAdd, onRemove }: ReportTagFieldProps) {
  return (
    <View className="min-h-[52px] rounded-2xl bg-white px-3 py-2.5">
      <View className="flex-row items-start gap-2">
        <View className="flex-1 flex-row flex-wrap items-center">
          {tags.map((tag) => (
            <View key={tag} className="mb-2 mr-2 max-w-full">
              <TapScale onPress={() => onRemove(tag)}>
                <View className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5">
                  <Text className="text-sm font-medium text-textPrimary">{tag}</Text>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </View>
              </TapScale>
            </View>
          ))}

          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={tags.length ? 'Thêm tag' : 'Nhập tag'}
            placeholderTextColor={colors.textDisabled}
            returnKeyType="done"
            onSubmitEditing={onAdd}
            className="mb-2 min-h-[36px] min-w-[96px] flex-1 px-1 py-1.5 text-[15px] text-textPrimary"
          />
        </View>

        <TapScale onPress={onAdd}>
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Ionicons name="add" size={18} color={colors.white} />
          </View>
        </TapScale>
      </View>
    </View>
  );
}
