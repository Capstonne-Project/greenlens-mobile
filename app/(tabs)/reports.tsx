import { SafeScreen } from '@/components/layout/SafeScreen';
import { Text } from '@/components/ui/text';

export default function ReportsTabScreen() {
  return (
    <SafeScreen className="justify-center px-6">
      <Text className="text-center text-xl font-semibold text-textPrimary">Báo cáo</Text>
      <Text className="mt-2 text-center text-base text-textSecondary">
        Danh sách báo cáo và bộ lọc — sẽ nối API ở bước tiếp theo.
      </Text>
    </SafeScreen>
  );
}
