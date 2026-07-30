import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/common/UserAvatar';
import { ProfileStatsCard, SettingsRow } from '@/components/inspection';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useInspectionKpi } from '@/hooks/useInspectionKpi';

export default function InspectorProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { kpi } = useInspectionKpi('ThisMonth');
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi ứng dụng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          setLoggingOut(true);
          void logout()
            .then(() => router.replace('/(auth)/login' as Href))
            .finally(() => setLoggingOut(false));
        },
      },
    ]);
  };

  const teamName = user?.teamName ?? kpi?.teamName;

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4" style={{ paddingTop: insets.top + 16 }}>
          <View className="flex-row items-center gap-3">
            <UserAvatar name={user?.fullName ?? 'Inspector'} avatarUrl={user?.avatarUrl} size={64} />
            <View className="flex-1">
              <Text className="text-lg font-bold text-textPrimary" numberOfLines={1}>
                {user?.fullName ?? 'Inspector'}
              </Text>
              {user?.email ? (
                <Text className="mt-0.5 text-sm text-textSecondary" numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
              <Text className="mt-0.5 text-xs font-semibold text-primary">
                Thanh tra viên{teamName ? ` · ${teamName}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {kpi ? (
          <View className="mx-4 mt-5 border-t border-border pt-4">
            <ProfileStatsCard
              items={[
                { value: String(kpi.totalInspections), label: 'Hồ sơ tháng này' },
                { value: `${Math.round(kpi.penaltyIssuedOnTimePercent)}%`, label: 'Đúng hạn' },
                { value: String(kpi.repeatOffenderCount), label: 'Tái phạm' },
              ]}
            />
          </View>
        ) : null}

        <View className="mx-4 mt-5">
          <Text className="mb-1 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
            Hoạt động
          </Text>
          <SettingsRow
            icon="notifications-outline"
            label="Thông báo"
            onPress={() => router.push('/(inspector)/(tabs)/notifications' as Href)}
          />
          <SettingsRow
            icon="document-text-outline"
            label="Hồ sơ đang xử lý"
            onPress={() => router.push('/(inspector)/(tabs)/queue' as Href)}
          />
          <SettingsRow
            icon="map-outline"
            label="Bản đồ hiện trường"
            isLast
            onPress={() => router.push('/(inspector)/(tabs)/map' as Href)}
          />
        </View>

        <View className="mx-4 mt-5">
          <Text className="mb-1 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
            Ứng dụng
          </Text>
          <SettingsRow icon="information-circle-outline" label="Phiên bản" value="1.0.0" showChevron={false} isLast />
        </View>

        <View className="mx-4 mt-5">
          <SettingsRow
            icon="log-out-outline"
            label={loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            tone="danger"
            showChevron={false}
            isLast
            onPress={loggingOut ? undefined : handleLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}
