import { Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { colors } from '@/theme/colors';

/** Chấm đỏ ô nhiễm trên Home map */
const DOT_COLOR = colors.error;
const DOT_SELECTED = '#B91C1C';
/** Báo cáo có chương trình dọn cộng đồng đang mở/chạy → chấm đen, tách biệt với báo cáo thường */
const DOT_COMMUNITY = '#111827';
const DOT_COMMUNITY_SELECTED = '#000000';

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
  const isCommunity = pin.isCommunity === true;
  const size = selected ? 16 : 12;
  const color = isCommunity
    ? selected
      ? DOT_COMMUNITY_SELECTED
      : DOT_COMMUNITY
    : selected
      ? DOT_SELECTED
      : DOT_COLOR;
  const haloColor = isCommunity ? 'rgba(17, 24, 39, 0.22)' : 'rgba(239, 68, 68, 0.22)';
  // Dot box is always 28px, pinned to the bottom of the marker view; the community
  // label (20px) sits above it. Anchor targets the dot's center so the coordinate
  // stays correct whether or not the label is rendered.
  const totalHeight = isCommunity ? 48 : 28;
  const anchorY = (totalHeight - 14) / totalHeight;

  return (
    <Marker
      coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
      anchor={{ x: 0.5, y: anchorY }}
      stopPropagation
      tracksViewChanges={selected}
      onPress={() => onPress(pin)}
    >
      <View className="items-center justify-center" style={{ width: 72, height: totalHeight }}>
        {isCommunity ? (
          <View
            className="mb-1 rounded-full border border-white px-2 py-0.5"
            style={{ backgroundColor: DOT_COMMUNITY, elevation: 3 }}
          >
            <Text className="text-[10px] font-semibold text-white">Cộng đồng</Text>
          </View>
        ) : null}
        <View className="items-center justify-center" style={{ width: 28, height: 28 }}>
          <View
            className="absolute rounded-full"
            style={{
              width: size + 10,
              height: size + 10,
              backgroundColor: haloColor,
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
      </View>
    </Marker>
  );
}
