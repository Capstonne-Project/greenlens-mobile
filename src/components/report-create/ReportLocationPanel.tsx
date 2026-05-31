import { CatalogPicker } from '@/components/report-create/CatalogPicker';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { CatalogProvince, CatalogWard } from '@/types/catalog.types';
import { Ionicons } from '@expo/vector-icons';
import { type RefObject } from 'react';
import MapView, { Marker, Polygon, type LatLng, type Region } from 'react-native-maps';
import { TouchableOpacity, View } from 'react-native';

interface ReportLocationPanelProps {
  mapRef: RefObject<MapView | null>;
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
  onProvinceSelect: (code: string) => void;
  onWardSelect: (code: string) => void;
  onMapPress: (coordinate: LatLng) => void;
  onLocatePress: () => void;
  onPermissionPress: () => void;
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
        <Input
          value={address}
          onChangeText={onAddressChange}
          placeholder="Ví dụ: 123 Nguyễn Huệ"
          className="mt-2 rounded-2xl border-0 bg-white px-4"
        />
      </View>

      <View className="overflow-hidden rounded-2xl border border-border">
        <MapView
          ref={mapRef}
          style={{ height: 280, width: '100%' }}
          initialRegion={initialRegion}
          onPress={(event) => onMapPress(event.nativeEvent.coordinate)}
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
          {marker ? <Marker coordinate={marker} /> : null}
        </MapView>
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
