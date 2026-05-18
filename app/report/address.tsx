import { AddressMapCard } from '@/components/report-create/AddressMapCard';
import { ReportFlowHeader } from '@/components/report-create/ReportFlowHeader';
import { ReportSectionCard } from '@/components/report-create/ReportSectionCard';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useCatalogAddress } from '@/hooks/useCatalogAddress';
import { useUserMapLocation } from '@/hooks/useUserMapLocation';
import { useCreateReportDraftStore } from '@/stores/createReportDraft.store';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LatLng } from 'react-native-maps';

export default function ReportAddressScreen() {
  const insets = useSafeAreaInsets();
  const images = useCreateReportDraftStore((state) => state.images);
  const setLocation = useCreateReportDraftStore((state) => state.setLocation);
  const {
    provinces,
    wards,
    isLoadingProvinces,
    isLoadingWards,
    errorMessage,
    provincePolygons,
    wardPolygons,
    loadProvinceBoundary,
    loadWardBoundary,
    refetchWards,
  } = useCatalogAddress();
  const { location: userLocation, refreshLocation } = useUserMapLocation();

  const [provinceCode, setProvinceCode] = useState<string | null>(null);
  const [wardCode, setWardCode] = useState<string | null>(null);
  const [addressLine, setAddressLine] = useState('');
  const [marker, setMarker] = useState<LatLng>({
    latitude: userLocation?.latitude ?? 10.7769,
    longitude: userLocation?.longitude ?? 106.7009,
  });

  useEffect(() => {
    if (!images.length) {
      router.replace('/(tabs)/create' as Href);
    }
  }, [images.length]);

  useEffect(() => {
    void refreshLocation();
  }, [refreshLocation]);

  useEffect(() => {
    if (!userLocation) {
      return;
    }

    setMarker({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    });
  }, [userLocation]);

  const selectedProvince = useMemo(
    () => provinces.find((item) => item.code === provinceCode) ?? null,
    [provinceCode, provinces],
  );

  const handleProvinceChange = useCallback(
    async (code: string) => {
      setProvinceCode(code);
      setWardCode(null);
      void loadWardBoundary(null);
      const province = provinces.find((item) => item.code === code);
      await loadProvinceBoundary(province?.boundaryUrl ?? null);
      await refetchWards(code);
    },
    [loadProvinceBoundary, loadWardBoundary, provinces, refetchWards],
  );

  const handleWardChange = useCallback(
    async (code: string) => {
      setWardCode(code);
      const ward = wards.find((item) => item.code === code);
      await loadWardBoundary(ward?.boundaryUrl ?? null);
    },
    [loadWardBoundary, wards],
  );

  const canContinue = Boolean(provinceCode && wardCode && addressLine.trim());

  const handleContinue = useCallback(() => {
    if (!canContinue || !provinceCode || !wardCode) {
      return;
    }

    setLocation({
      latitude: marker.latitude,
      longitude: marker.longitude,
      address: addressLine.trim(),
      provinceCode,
      wardCode,
      capturedAt: new Date().toISOString(),
    });
    router.push('/report/form' as Href);
  }, [addressLine, canContinue, marker.latitude, marker.longitude, provinceCode, setLocation, wardCode]);

  return (
    <SafeScreen className="bg-surface" edges={['top']}>
      <ReportFlowHeader
        title="Chọn địa chỉ"
        subtitle="Gắn vị trí hành chính cho ảnh từ thư viện"
        onBack={() => router.back()}
      />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 20) + 112,
          gap: 16,
        }}
      >
        {errorMessage ? (
          <View className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3">
            <Text className="text-sm text-error">{errorMessage}</Text>
          </View>
        ) : null}

        {isLoadingProvinces ? (
          <View className="items-center py-10">
            <ActivityIndicator />
          </View>
        ) : (
          <AddressMapCard
            provinces={provinces}
            wards={wards}
            isLoadingProvinces={isLoadingProvinces}
            isLoadingWards={isLoadingWards}
            provinceCode={provinceCode}
            wardCode={wardCode}
            addressLine={addressLine}
            marker={marker}
            provincePolygons={provincePolygons}
            wardPolygons={wardPolygons}
            onProvinceChange={(code) => void handleProvinceChange(code)}
            onWardChange={(code) => void handleWardChange(code)}
            onAddressChange={setAddressLine}
            onMarkerChange={setMarker}
          />
        )}

        {selectedProvince ? (
          <ReportSectionCard title="Đã chọn">
            <Text className="text-sm text-textSecondary">
              {selectedProvince.name}
              {wardCode ? ` · ${wards.find((item) => item.code === wardCode)?.name ?? wardCode}` : ''}
            </Text>
          </ReportSectionCard>
        ) : null}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-4 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Button
          className="h-12 rounded-2xl"
          disabled={!canContinue}
          onPress={handleContinue}
        >
          <Text className="font-semibold text-primary-foreground">Tiếp tục</Text>
        </Button>
      </View>
    </SafeScreen>
  );
}
