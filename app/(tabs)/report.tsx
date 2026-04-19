import { View, Text } from 'react-native';
import { SafeScreen } from '@/components/layout/SafeScreen';

export default function ReportScreen() {
  return (
    <SafeScreen className="px-4">
      <Text className="text-2xl font-bold text-textPrimary mt-4">Tạo báo cáo</Text>
    </SafeScreen>
  );
}
