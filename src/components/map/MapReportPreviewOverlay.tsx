import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { MapReportCalloutCard } from '@/components/map/MapReportCalloutCard';
import { TapScale } from '@/components/layout/TapScale';

interface MapReportPreviewOverlayProps {
  pin: CitizenMapPin;
  onDismiss: () => void;
  onOpenDetail?: () => void;
}

/**
 * Preview card cố định trên map khi chọn pin.
 * Dùng thay Callout native vì Callout không ổn định khi camera pitch/orbit 3D.
 */
export function MapReportPreviewOverlay({ pin, onDismiss, onOpenDetail }: MapReportPreviewOverlayProps) {
  return (
    <View className="absolute bottom-[200px] left-4 right-4 z-30" pointerEvents="box-none">
      <View className="relative">
        <TapScale onPress={() => onOpenDetail?.()}>
          <MapReportCalloutCard pin={pin} />
        </TapScale>
        <View className="absolute right-2 top-2 z-10">
          <TapScale onPress={onDismiss}>
            <View className="h-8 w-8 items-center justify-center rounded-full bg-black/45">
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </View>
          </TapScale>
        </View>
      </View>
    </View>
  );
}
