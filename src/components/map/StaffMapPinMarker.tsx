import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors } from '@/theme/colors';
import type { StaffMapPin } from '@/hooks/useStaffMapPins';

const SEVERITY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Low:      'leaf',
  Medium:   'warning',
  High:     'flame',
  Critical: 'nuclear',
};

interface StaffMapPinMarkerProps {
  pin: StaffMapPin;
  onPress?: (pin: StaffMapPin) => void;
}

export function StaffMapPinMarker({ pin, onPress }: StaffMapPinMarkerProps) {
  const icon = SEVERITY_ICON[pin.severity] ?? 'alert-circle';

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
          className="h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-md"
          style={{ backgroundColor: pin.color }}
        >
          <Ionicons name={icon} size={16} color={colors.white} />
        </View>
        <View
          className="h-2 w-2 rotate-45 rounded-sm"
          style={{ backgroundColor: pin.color, marginTop: -4 }}
        />
      </View>
    </Marker>
  );
}
