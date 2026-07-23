import { Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { colors } from '@/theme/colors';

/** Chấm đỏ ô nhiễm trên Home map */
const DOT_COLOR = colors.error;
const DOT_SELECTED = '#B91C1C';

interface CitizenMapPinMarkerProps {
  pin: CitizenMapPin;
  selected: boolean;
  onPress: (pin: CitizenMapPin) => void;
}

export function CitizenMapPinMarker({
  pin,
  selected,
  onPress,
}: CitizenMapPinMarkerProps) {
  const size = selected ? 16 : 12;
  const color = selected ? DOT_SELECTED : DOT_COLOR;

  return (
    <Marker
      coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      stopPropagation
      tracksViewChanges={selected}
      onPress={() => onPress(pin)}
    >
      <View className="items-center justify-center" style={{ width: 28, height: 28 }}>
        <View
          className="absolute rounded-full"
          style={{
            width: size + 10,
            height: size + 10,
            backgroundColor: 'rgba(239, 68, 68, 0.22)',
          }}
        />
        <View
          className="rounded-full border-2 border-white"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 3,
          }}
        />
        {pin.clusterCount != null && pin.clusterCount > 1 ? (
          <View
            className="absolute -right-0.5 -top-0.5 min-w-[16px] items-center rounded-full px-1"
            style={{ backgroundColor: colors.textPrimary }}
          >
            <Text className="text-[9px] font-bold text-white">{pin.clusterCount}</Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}
