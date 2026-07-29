import { NotificationBell } from '@/components/common/NotificationBell';
import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';

interface MyReportsHubHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCreatePress: () => void;
}

/** Header kiểu TikTok/Shopee order list — tinh gọn phong cách châu Âu */
export function MyReportsHubHeader({
  searchQuery,
  onSearchChange,
  onCreatePress,
}: MyReportsHubHeaderProps) {
  return (
    <View className="bg-white px-4 pb-3 pt-2">
      <View className="mb-3.5 flex-row items-center justify-between">
        <Text className="text-[22px] font-semibold tracking-tight text-textPrimary">
          Báo cáo của tôi
        </Text>
        <View className="flex-row items-center gap-1">
          <NotificationBell size={22} />
          <TapScale onPress={onCreatePress}>
            <View className="h-9 w-9 items-center justify-center rounded-full border border-border bg-white">
              <Ionicons name="add" size={20} color={colors.textPrimary} />
            </View>
          </TapScale>
        </View>
      </View>

      <View className="h-11 flex-row items-center rounded-full bg-surface px-3.5">
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Tìm theo mã, loại rác, địa chỉ…"
          placeholderTextColor={colors.textDisabled}
          className="ml-2 flex-1 text-[14px] text-textPrimary"
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {searchQuery.length > 0 ? (
          <TapScale onPress={() => onSearchChange('')}>
            <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
          </TapScale>
        ) : null}
      </View>
    </View>
  );
}

export interface MyReportsTabCounts {
  ALL?: number;
  InProgress?: number;
  NEEDS_CONFIRM?: number;
  DONE?: number;
  Rejected?: number;
}
