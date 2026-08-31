import { Text, View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';

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
  // Marker box luôn cố định 28px bất kể isCommunity — báo hiệu "cộng đồng" bằng 1 badge
  // icon nhỏ gắn ở góc chấm (giống pin cluster count), không còn nhãn text riêng phía
  // trên. Nhiều pin cộng đồng đứng cạnh nhau (mật độ cao ở trung tâm) trước đây mỗi cái
  // vẽ 1 nhãn "Cộng đồng" full-width → chồng lấp, không đọc được; badge góc thì luôn nằm
  // gọn trong khung 28px nên không bao giờ đè nhau. Chi tiết đầy đủ hiện ở sheet card khi
  // user chọn pin.
  return (
    <Marker
      id={`citizen-pin-${pin.id}`}
      lngLat={[pin.longitude, pin.latitude]}
      onPress={() => onPress(pin)}
    >
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
        {isCommunity ? (
          <View
            className="absolute -left-0.5 -top-0.5 items-center justify-center rounded-full border border-white"
            style={{ width: 14, height: 14, backgroundColor: DOT_COMMUNITY, elevation: 4 }}
          >
            <Ionicons name="people" size={8} color={colors.white} />
          </View>
        ) : null}
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
