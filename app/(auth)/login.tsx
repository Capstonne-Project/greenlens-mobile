import { Text } from 'react-native';
import { SafeScreen } from '@/components/layout/SafeScreen';

export default function LoginScreen() {
  return (
    <SafeScreen className="px-4 justify-center">
      <Text className="text-2xl font-bold text-textPrimary text-center">Đăng nhập</Text>
    </SafeScreen>
  );
}
