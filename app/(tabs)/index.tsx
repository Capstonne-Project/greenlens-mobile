import { Text } from 'react-native';
import { SafeScreen } from '@/components/layout/SafeScreen';

export default function HomeScreen() {
  return (
    <SafeScreen className="px-4">
      <Text className="text-2xl font-bold text-textPrimary mt-4">Trang chủ</Text>
    </SafeScreen>
  );
}
