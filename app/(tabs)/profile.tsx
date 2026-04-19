import { View, Text } from 'react-native';
import { SafeScreen } from '@/components/layout/SafeScreen';

export default function ProfileScreen() {
  return (
    <SafeScreen className="px-4">
      <Text className="text-2xl font-bold text-textPrimary mt-4">Hồ sơ cá nhân</Text>
    </SafeScreen>
  );
}
