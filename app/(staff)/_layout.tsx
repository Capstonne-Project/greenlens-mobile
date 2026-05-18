import { StaffTabBar } from '@/components/layout/StaffTabBar';
import { Tabs } from 'expo-router';

export default function StaffLayout() {
  return (
    <Tabs
      tabBar={(props) => <StaffTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="map" options={{ title: 'Bản đồ' }} />
      <Tabs.Screen name="assignments" options={{ href: null, title: 'Nhiệm vụ' }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: 'Thông báo' }} />
      <Tabs.Screen name="members" options={{ title: 'Thành viên' }} />
      <Tabs.Screen name="settings" options={{ title: 'Cài đặt' }} />
    </Tabs>
  );
}
