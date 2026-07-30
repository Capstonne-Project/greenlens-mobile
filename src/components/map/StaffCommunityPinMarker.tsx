import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { StaffCommunityPin } from '@/hooks/useStaffCommunityPins';

interface StaffCommunityPinMarkerProps {
  pin: StaffCommunityPin;
  onPress?: (pin: StaffCommunityPin) => void;
}

/**
 * Pin chương trình cộng đồng — dùng hình vuông bo góc + icon người,
 * khác hẳn pin nhiệm vụ (tròn + icon mức độ) để không nhầm lẫn trên bản đồ.
 */
export function StaffCommunityPinMarker({ pin, onPress }: StaffCommunityPinMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={false}
      stopPropagation
      onPress={() => onPress?.(pin)}
    >
      <View className="items-center">
        <View
          className="flex-row items-center gap-1 rounded-lg border-2 border-white px-2 py-1 shadow-md"
          style={{ backgroundColor: pin.color }}
        >
          <Ionicons name="people" size={14} color={colors.white} />
          <Text className="text-[11px] font-bold text-white">{pin.participantCount}</Text>
        </View>
        <View
          className="h-2 w-2 rotate-45 rounded-sm"
          style={{ backgroundColor: pin.color, marginTop: -4 }}
        />
      </View>
    </Marker>
  );
}
