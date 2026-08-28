import { CatalogPicker } from '@/components/report-create/CatalogPicker';
import { GoongMapView, type GoongMapViewRef, type LatLng, type Region } from '@/components/map/GoongMapView';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useReportLocationMapCamera } from '@/hooks/useReportLocationMapCamera';
import { colors } from '@/theme/colors';
import type { CatalogProvince, CatalogWard } from '@/types/catalog.types';
import { useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native';

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

// `id`/`key` PHẢI ổn định (không phụ thuộc provinceCode/wardCode) — nếu đổi theo code, mỗi lần
// chọn tỉnh/phường mới React sẽ unmount + mount lại GeoJSONSource native view. Khi việc này xảy ra
// đồng thời với fitToCoordinates() (camera đang animate trong requestAnimationFrame), Fabric có thể
// nhận 2 mount batch chồng nhau trong cùng 1 frame và cố addViewAt một view đã có parent, dẫn tới
// crash: "IllegalStateException: The specified child already has a parent." Giữ id cố định theo
// `kind` (province/ward), chỉ để `data` prop thay đổi — MapLibre tự update layer tại chỗ.
function polygonSource(kind: string, rings: LatLng[][], strokeColor: string, fillColor: string) {
  return rings.map((ring, index) => {
    const coords = ring.map((p) => [p.longitude, p.latitude]);
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) coords.push(first);

    const id = `${kind}-${index}`;
    return (
      <GeoJSONSource
        key={id}
        id={id}
        data={{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } }}
      >
        <Layer id={`${id}-fill`} type="fill" paint={{ 'fill-color': fillColor }} />
        <Layer id={`${id}-line`} type="line" paint={{ 'line-color': strokeColor, 'line-width': 2 }} />
      </GeoJSONSource>
    );
  });
}

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
  const mapRef = useRef<GoongMapViewRef | null>(null);

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
        <GoongMapView
          ref={mapRef}
          style={{ width: '100%', height: 280 }}
          initialRegion={DEFAULT_REGION}
          onMapPress={(coords) => onMarkerChange(coords)}
        >
          {polygonSource('province', provincePolygons, colors.primary, 'rgba(16, 185, 129, 0.12)')}
          {polygonSource('ward', wardPolygons, colors.info, 'rgba(59, 130, 246, 0.14)')}
          <Marker id="address-map-marker" lngLat={[marker.longitude, marker.latitude]} anchor="bottom">
            <View className="h-6 w-6 rounded-full border-2 border-white" style={{ backgroundColor: colors.primary }} />
          </Marker>
        </GoongMapView>
      </View>
    </View>
  );
}
