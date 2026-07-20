import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { MyReportsFilterKey } from '@/types/my-reports.types';
import { MY_REPORTS_FILTERS } from '@/types/my-reports.types';
import type { RefObject } from 'react';
import { FlatList, View } from 'react-native';

interface MyReportsFilterBarProps {
  listRef: RefObject<FlatList<(typeof MY_REPORTS_FILTERS)[number]> | null>;
  activeFilter: MyReportsFilterKey;
  activeCount?: number;
  isCountLoading?: boolean;
  onSelectIndex: (index: number) => void;
}

interface FilterTabProps {
  label: string;
  count?: number;
  isActive: boolean;
  onPress: () => void;
}

/** Tab gạch dưới kiểu Shopee/TikTok — accent primary, spacing rộng kiểu châu Âu */
function FilterTab({ label, count, isActive, onPress }: FilterTabProps) {
  return (
    <TapScale onPress={onPress}>
      <View className="mr-5 items-center pb-2.5 pt-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            className="text-[14px]"
            style={{
              color: isActive ? colors.textPrimary : colors.textSecondary,
              fontWeight: isActive ? '700' : '500',
            }}
          >
            {label}
          </Text>
          {typeof count === 'number' ? (
            <Text
              className="text-[12px]"
              style={{
                color: isActive ? colors.primary : colors.textDisabled,
                fontWeight: isActive ? '700' : '500',
              }}
            >
              {count}
            </Text>
          ) : null}
        </View>
        {isActive ? (
          <View
            className="absolute bottom-0 h-[2px] w-full rounded-full"
            style={{ backgroundColor: colors.primary }}
          />
        ) : null}
      </View>
    </TapScale>
  );
}

export function MyReportsFilterBar({
  listRef,
  activeFilter,
  activeCount,
  isCountLoading,
  onSelectIndex,
}: MyReportsFilterBarProps) {
  return (
    <View className="border-b border-border bg-white">
      <FlatList
        ref={listRef}
        data={MY_REPORTS_FILTERS}
        horizontal
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item, index }) => (
          <FilterTab
            label={item.label}
            count={
              activeFilter === item.key && !isCountLoading && typeof activeCount === 'number'
                ? activeCount
                : undefined
            }
            isActive={activeFilter === item.key}
            onPress={() => onSelectIndex(index)}
          />
        )}
      />
    </View>
  );
}
