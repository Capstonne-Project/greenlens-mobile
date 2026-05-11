import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';

interface CitizenMapToolbarProps {
  onLayers?: () => void;
  onLocate?: () => void;
  onFilters?: () => void;
  onZoomIn?: () => void;
  layersActive?: boolean;
  locateActive?: boolean;
}

export function CitizenMapToolbar({
  onLayers,
  onLocate,
  onFilters,
  onZoomIn,
  layersActive = false,
  locateActive = false,
}: CitizenMapToolbarProps) {
  return (
    <View className="absolute right-3 z-10 gap-2" style={{ bottom: 220 }}>
      <ToolbarIcon icon="layers-outline" onPress={onLayers ?? (() => {})} active={layersActive} />
      <ToolbarIcon icon="locate-outline" onPress={onLocate ?? (() => {})} active={locateActive} />
      <ToolbarIcon icon="options-outline" onPress={onFilters ?? (() => {})} />
      <ToolbarIcon icon="add-outline" onPress={onZoomIn ?? (() => {})} />
    </View>
  );
}

interface ToolbarIconProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
}

function ToolbarIcon({ icon, onPress, active = false }: ToolbarIconProps) {
  return (
    <TapScale onPress={onPress}>
      <View
        className={`h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm shadow-black/10 ${
          active ? 'border-primary' : 'border-border'
        }`}
      >
        <Ionicons name={icon} size={22} color={active ? '#059669' : '#334155'} />
      </View>
    </TapScale>
  );
}
