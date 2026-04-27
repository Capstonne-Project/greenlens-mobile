import { View } from "react-native";

interface MapMarkerProps {
  isActive?: boolean;
}

export function MapMarker({ isActive = false }: MapMarkerProps) {
  return (
    <View
      className={`h-3 w-3 rounded-full border-2 ${isActive ? "border-primary bg-primary" : "border-border bg-white"}`}
    />
  );
}
