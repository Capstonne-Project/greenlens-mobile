import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import MapView, { Marker, Polygon, type LatLng, type Region } from 'react-native-maps';
import { Input } from '@/components/ui/input';
import { CatalogPicker } from '@/components/report-create/CatalogPicker';
import { colors } from '@/theme/colors';
import type { CatalogProvince, CatalogWard } from '@/types/catalog.types';

interface AddressMapCardProps {
  provinces: CatalogProvince[];
  wards: CatalogWard[];
  isLoadingProvinces: boolean;
  isLoadingWards: boolean;
  provinceCode: string | null;
  wardCode: string | null;
  addressLine: string;
  marker: LatLng;
  provincePolygons: LatLng[][];
  wardPolygons: LatLng[][];
  onProvinceChange: (code: string) => void;
  onWardChange: (code: string) => void;
  onAddressChange: (value: string) => void;
  onMarkerChange: (coords: LatLng) => void;
}

const DEFAULT_REGION: Region = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function AddressMapCard({
  provinces,
  wards,
  isLoadingProvinces,
  isLoadingWards,
  provinceCode,
  wardCode,
  addressLine,
  marker,
  provincePolygons,
  wardPolygons,
  onProvinceChange,
  onWardChange,
  onAddressChange,
  onMarkerChange,
}: AddressMapCardProps) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: marker.latitude,
        longitude: marker.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      350,
    );
  }, [marker.latitude, marker.longitude]);

  useEffect(() => {
    const points = [...provincePolygons, ...wardPolygons].flat();
    if (!points.length) {
      return;
    }

    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: true,
    });
  }, [provincePolygons, wardPolygons]);

  return (
    <View className="gap-4">
      {isLoadingProvinces ? (
        <View className="items-center py-6">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <CatalogPicker
          label="Tỉnh / Thành phố"
          placeholder="Chọn tỉnh thành"
          value={provinceCode}
          items={provinces.map((item) => ({
            code: item.code,
            label: item.name,
          }))}
          onSelect={onProvinceChange}
        />
      )}

      <CatalogPicker
        label="Phường / Xã"
        placeholder={provinceCode ? 'Chọn phường xã' : 'Chọn tỉnh trước'}
        value={wardCode}
        items={wards.map((item) => ({
          code: item.code,
          label: item.name,
          description: item.unitAbbreviation,
        }))}
        disabled={!provinceCode || isLoadingWards}
        onSelect={onWardChange}
      />

      <View className="gap-2">
        <Text className="text-sm font-semibold text-textPrimary">Số nhà, đường</Text>
        <Input
          value={addressLine}
          onChangeText={onAddressChange}
          placeholder="Ví dụ: 123 Nguyễn Huệ"
          className="rounded-2xl border-border bg-surface px-4"
        />
      </View>

      <View className="overflow-hidden rounded-3xl border border-border">
        <MapView
          ref={mapRef}
          style={{ width: '100%', height: 280 }}
          initialRegion={DEFAULT_REGION}
          onPress={(event) => onMarkerChange(event.nativeEvent.coordinate)}
        >
          {provincePolygons.map((ring, index) => (
            <Polygon
              key={`province-${index}`}
              coordinates={ring}
              strokeColor={colors.primary}
              fillColor="rgba(16, 185, 129, 0.12)"
              strokeWidth={2}
            />
          ))}
          {wardPolygons.map((ring, index) => (
            <Polygon
              key={`ward-${index}`}
              coordinates={ring}
              strokeColor={colors.info}
              fillColor="rgba(59, 130, 246, 0.14)"
              strokeWidth={2}
            />
          ))}
          <Marker
            coordinate={marker}
            draggable
            onDragEnd={(event) => onMarkerChange(event.nativeEvent.coordinate)}
          />
        </MapView>
      </View>
    </View>
  );
}
