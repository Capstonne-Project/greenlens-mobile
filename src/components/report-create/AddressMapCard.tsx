import { CatalogPicker } from '@/components/report-create/CatalogPicker';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useReportLocationMapCamera } from '@/hooks/useReportLocationMapCamera';
import { colors } from '@/theme/colors';
import type { CatalogProvince, CatalogWard } from '@/types/catalog.types';
import { useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MapView, { Marker, Polygon, type LatLng, type Region } from 'react-native-maps';

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
  onProvinceChange: (code: string | null) => void;
  onWardChange: (code: string | null) => void;
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

  useReportLocationMapCamera({
    enabled: true,
    mapRef,
    marker,
    provinceCode,
    wardCode,
    provincePolygons,
    wardPolygons,
  });

  return (
    <View className="gap-5">
      {isLoadingProvinces ? (
        <View className="items-center py-6">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <CatalogPicker
          variant="section"
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
        variant="section"
        label="Phường / Xã"
        placeholder={provinceCode ? (isLoadingWards ? 'Đang tải...' : 'Chọn phường xã') : 'Chọn tỉnh trước'}
        value={wardCode}
        items={wards.map((item) => ({
          code: item.code,
          label: item.name,
          description: item.unitAbbreviation,
        }))}
        disabled={!provinceCode || isLoadingWards}
        onSelect={onWardChange}
      />

      <View>
        <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">
          Số nhà, đường
        </Text>
        <View className="mt-2 overflow-hidden rounded-2xl bg-white">
          <Input
            value={addressLine}
            onChangeText={onAddressChange}
            placeholder="Ví dụ: 123 Nguyễn Huệ"
            multiline
            numberOfLines={3}
            scrollEnabled
            textAlignVertical="top"
            className="h-auto min-h-14 max-h-28 w-full items-start border-0 bg-transparent px-4 py-3 leading-5 shadow-none"
          />
        </View>
      </View>

      <View className="overflow-hidden rounded-2xl border border-border">
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
