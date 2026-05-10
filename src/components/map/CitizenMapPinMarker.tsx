import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { colors } from '@/theme/colors';
import type { ReportCategory } from '@/types/report.types';

const PIN_COLOR: Record<ReportCategory, string> = {
  waste: colors.warning,
  water_pollution: colors.info,
  air_pollution: colors.error,
  noise: '#8B5CF6',
  other: colors.textSecondary,
};

const PIN_ICON: Record<ReportCategory, keyof typeof Ionicons.glyphMap> = {
  waste: 'trash',
  water_pollution: 'water',
  air_pollution: 'cloud',
  noise: 'volume-high',
  other: 'help',
};

interface CitizenMapPinMarkerProps {
  pin: CitizenMapPin;
  selected: boolean;
  onPress: (pin: CitizenMapPin) => void;
}

export function CitizenMapPinMarker({ pin, selected, onPress }: CitizenMapPinMarkerProps) {
  const bg = PIN_COLOR[pin.category] ?? colors.textSecondary;
  const border = selected ? 'border-2 border-white' : 'border border-white/80';

  return (
    <Marker
      coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
      onPress={() => onPress(pin)}
      tracksViewChanges={false}
    >
      <View className="items-center">
        <View className="relative">
          <View
            className={`h-10 w-10 items-center justify-center rounded-full shadow-md ${border}`}
            style={{ backgroundColor: bg }}
          >
            <Ionicons name={PIN_ICON[pin.category]} size={20} color={colors.white} />
          </View>
          {pin.clusterCount != null && pin.clusterCount > 1 && (
            <View className="absolute -right-1 -top-1 min-w-[18px] items-center rounded-full px-1" style={{ backgroundColor: colors.textPrimary }}>
              <Text className="text-[10px] font-bold text-white">{pin.clusterCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Marker>
  );
}
