import type { CitizenMapPin } from '@/data/citizen-map-mock';
import { MapReportCalloutCard } from '@/components/map/MapReportCalloutCard';
import { TapScale } from '@/components/layout/TapScale';
import { View } from 'react-native';

interface MapReportPreviewOverlayProps {
  pin: CitizenMapPin;
  onDismiss: () => void;
  onOpenDetail?: () => void;
}

/** Fallback overlay cố định (khi không dùng Callout native) */
export function MapReportPreviewOverlay({ pin, onDismiss, onOpenDetail }: MapReportPreviewOverlayProps) {
  return (
    <View className="absolute bottom-[200px] left-4 right-4 z-30">
      <TapScale onPress={() => onOpenDetail?.()}>
        <MapReportCalloutCard pin={pin} />
      </TapScale>
    </View>
  );
}
