import { View, Text } from 'react-native';
import { SafeScreen } from '@/components/layout/SafeScreen';

export default function MapScreen() {
  return (
    <SafeScreen className="items-center justify-center">
      <Text className="text-lg text-textSecondary">Bản đồ ô nhiễm</Text>
    </SafeScreen>
  );
}
