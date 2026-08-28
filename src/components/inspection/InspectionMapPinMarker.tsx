import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';

import { colors } from '@/theme/colors';
import type { InspectionQueueItem, InspectionStatus } from '@/types/inspection.types';
import { INSPECTION_STATUS_MAP_COLOR } from '@/utils/inspection-map-legend';

const STATUS_ICON: Record<InspectionStatus, keyof typeof Ionicons.glyphMap> = {
  Draft: 'hand-left',
  InProgress: 'search',
  PenaltyIssued: 'document-text',
  PartiallyPaid: 'cash',
  Overdue: 'alarm',
  Paid: 'checkmark',
  Closed: 'lock-closed',
  ClosedNoViolation: 'close',
};

interface InspectionMapPinMarkerProps {
  item: InspectionQueueItem;
  selected: boolean;
  onPress: (item: InspectionQueueItem) => void;
}

function InspectionMapPinMarkerBase({
  item,
  selected,
  onPress,
}: InspectionMapPinMarkerProps) {
  const color = INSPECTION_STATUS_MAP_COLOR[item.status] ?? colors.textSecondary;
  const size = selected ? 42 : 36;

  return (
    <Marker
      id={`inspection-pin-${item.id}`}
      lngLat={[item.longitude, item.latitude]}
      anchor="bottom"
      onPress={() => onPress(item)}
    >
      <View className="items-center">
        <View
          className="items-center justify-center rounded-full border-2 border-white shadow-md"
          style={{ backgroundColor: color, height: size, width: size }}
        >
          <Ionicons
            name={STATUS_ICON[item.status] ?? 'alert-circle'}
            size={selected ? 19 : 16}
            color={colors.white}
          />
        </View>

        {item.isRepeatOffender ? (
          <View
            className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full border-2 border-white"
            style={{ backgroundColor: colors.error }}
          >
            <Ionicons name="alert" size={9} color={colors.white} />
          </View>
        ) : null}

        <View
          className="h-2.5 w-2.5 rotate-45 rounded-sm"
          style={{ backgroundColor: color, marginTop: -5 }}
        />
      </View>
    </Marker>
  );
}

export const InspectionMapPinMarker = memo(InspectionMapPinMarkerBase);
