import { CatalogPicker } from '@/components/report-create/CatalogPicker';
import { GoongMapView, type GoongMapViewRef, type LatLng, type Region } from '@/components/map/GoongMapView';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { CatalogProvince, CatalogWard } from '@/types/catalog.types';
import { Ionicons } from '@expo/vector-icons';
import { type RefObject } from 'react';
import { GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native';
import { TouchableOpacity, View } from 'react-native';

interface ReportLocationPanelProps {
  mapRef: RefObject<GoongMapViewRef | null>;
  initialRegion: Region;
  marker: LatLng | null;
  address: string;
  provinceCode: string | null;
  wardCode: string | null;
  provinces: CatalogProvince[];
  wards: CatalogWard[];
  isLoadingProvinces: boolean;
  isLoadingWards: boolean;
  provincePolygons: LatLng[][];
  wardPolygons: LatLng[][];
  errorMessage?: string | null;
  permissionDenied?: boolean;
  isLocating?: boolean;
  onAddressChange: (value: string) => void;
  onProvinceSelect: (code: string | null) => void;
  onWardSelect: (code: string | null) => void;
  onMapPress: (coordinate: LatLng) => void;
  onLocatePress: () => void;
  onPermissionPress: () => void;
}

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

export function ReportLocationPanel({
  mapRef,
  initialRegion,
  marker,
  address,
  provinceCode,
  wardCode,
  provinces,
  wards,
  isLoadingProvinces,
  isLoadingWards,
  provincePolygons,
  wardPolygons,
  errorMessage,
  permissionDenied = false,
  isLocating = false,
  onAddressChange,
  onProvinceSelect,
  onWardSelect,
  onMapPress,
  onLocatePress,
  onPermissionPress,
}: ReportLocationPanelProps) {
  return (
    <View className="gap-5">
      {errorMessage ? (
        <View className="rounded-2xl bg-error/10 px-4 py-3">
          <Text className="text-sm text-error">{errorMessage}</Text>
        </View>
      ) : null}

      <CatalogPicker
        variant="section"
        label="Tỉnh / Thành phố"
        placeholder={isLoadingProvinces ? 'Đang tải...' : 'Chọn tỉnh thành'}
        value={provinceCode}
        items={provinces.map((item) => ({ code: item.code, label: item.name }))}
        disabled={isLoadingProvinces}
        onSelect={onProvinceSelect}
      />

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
        onSelect={onWardSelect}
      />

      <View>
        <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">
          Số nhà, đường
        </Text>
        <View className="mt-2 overflow-hidden rounded-2xl bg-white">
          <Input
            value={address}
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
          style={{ height: 280, width: '100%' }}
          initialRegion={initialRegion}
          onMapPress={onMapPress}
        >
          {polygonSource('report-province', provincePolygons, colors.primary, 'rgba(16, 185, 129, 0.12)')}
          {polygonSource('report-ward', wardPolygons, colors.info, 'rgba(59, 130, 246, 0.14)')}
          {marker ? (
            <Marker id="report-location-marker" lngLat={[marker.longitude, marker.latitude]} anchor="bottom">
              <View className="h-6 w-6 rounded-full border-2 border-white" style={{ backgroundColor: colors.primary }} />
            </Marker>
          ) : null}
        </GoongMapView>
      </View>

      {permissionDenied ? (
        <View className="overflow-hidden rounded-2xl bg-warning/10">
          <View className="flex-row items-start gap-3 px-4 py-3.5">
            <Ionicons name="location-outline" size={20} color={colors.warning} style={{ marginTop: 1 }} />
            <View className="flex-1 gap-1">
              <Text className="text-sm font-semibold text-textPrimary">Chưa có quyền vị trí</Text>
              <Text className="text-sm text-textSecondary">
                App cần quyền vị trí để xác định nơi xảy ra sự cố. Bạn vẫn có thể chọn tỉnh/phường thủ công.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => void onPermissionPress()}
            className="flex-row items-center justify-center gap-2 border-t border-warning/20 py-3"
          >
            <Ionicons name="settings-outline" size={16} color={colors.warning} />
            <Text className="text-sm font-semibold" style={{ color: colors.warning }}>
              Mở Cài đặt để cấp quyền
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onLocatePress}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary/10 py-3"
        >
          {isLocating ? (
            <Ionicons name="reload-outline" size={18} color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={18} color={colors.primary} />
          )}
          <Text className="text-sm font-semibold text-primary">
            {isLocating ? 'Đang lấy vị trí...' : 'Lấy vị trí của tôi'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
