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
  /** Khi false: chỉ stack icon (parent tự absolute). Mặc định absolute góc phải. */
  floating?: boolean;
  bottomOffset?: number;
}

export function CitizenMapToolbar({
  onLayers,
  onLocate,
  onFilters,
  onZoomIn,
  layersActive = false,
  locateActive = false,
  floating = true,
  bottomOffset = 220,
}: CitizenMapToolbarProps) {
  return (
    <View
      className={floating ? 'absolute right-3 z-10 gap-2' : 'gap-2'}
      style={floating ? { bottom: bottomOffset } : undefined}
    >
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
