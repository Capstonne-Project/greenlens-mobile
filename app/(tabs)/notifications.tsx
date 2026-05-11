import { SafeScreen } from '@/components/layout/SafeScreen';
import { Text } from '@/components/ui/text';

export default function NotificationsTabScreen() {
  return (
    <SafeScreen className="justify-center px-6">
      <Text className="text-center text-xl font-semibold text-textPrimary">Thông báo</Text>
      <Text className="mt-2 text-center text-base text-textSecondary">
        Thông báo từ hệ thống và phản hồi báo cáo — sắp có.
      </Text>
    </SafeScreen>
  );
}
