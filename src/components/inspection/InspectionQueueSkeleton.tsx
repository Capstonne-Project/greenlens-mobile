import { View } from 'react-native';

const PLACEHOLDER_COUNT = 4;

function SkeletonCard() {
  return (
    <View className="mx-4 mb-3 flex-row overflow-hidden rounded-2xl border border-border bg-white">
      <View className="w-1 bg-surface" />
      <View className="flex-1 p-4">
        <View className="mb-3 flex-row justify-between">
          <View className="h-3 w-24 rounded-full bg-surface" />
          <View className="h-5 w-20 rounded-full bg-surface" />
        </View>
        <View className="mb-2 h-4 w-2/3 rounded-full bg-surface" />
        <View className="mb-3 h-3 w-full rounded-full bg-surface" />
        <View className="flex-row justify-between border-t border-border pt-2.5">
          <View className="h-3 w-20 rounded-full bg-surface" />
          <View className="h-3 w-14 rounded-full bg-surface" />
        </View>
      </View>
    </View>
  );
}

/** Skeleton danh sách hồ sơ tĩnh — thay spinner theo rule UX dự án. */
export function InspectionQueueSkeleton() {
  return (
    <View>
      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}
