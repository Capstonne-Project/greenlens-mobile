import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';

interface CitizenMapToolbarProps {
  onLayers?: () => void;
  onLocate?: () => void;
  onFilters?: () => void;
  onZoomIn?: () => void;
}

export function CitizenMapToolbar({
  onLayers,
  onLocate,
  onFilters,
  onZoomIn,
}: CitizenMapToolbarProps) {
  return (
    <View className="absolute right-3 z-10 gap-2" style={{ bottom: 220 }}>
      <ToolbarIcon icon="layers-outline" onPress={onLayers ?? (() => {})} />
      <ToolbarIcon icon="locate-outline" onPress={onLocate ?? (() => {})} />
      <ToolbarIcon icon="options-outline" onPress={onFilters ?? (() => {})} />
      <ToolbarIcon icon="add-outline" onPress={onZoomIn ?? (() => {})} />
    </View>
  );
}

interface ToolbarIconProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

function ToolbarIcon({ icon, onPress }: ToolbarIconProps) {
  return (
    <TapScale onPress={onPress}>
      <View className="h-11 w-11 items-center justify-center rounded-full border border-border bg-white shadow-sm shadow-black/10">
        <Ionicons name={icon} size={22} color="#334155" />
      </View>
    </TapScale>
  );
}
