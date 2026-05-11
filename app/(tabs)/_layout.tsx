import { CitizenTabBar } from '@/components/layout/CitizenTabBar';
import { Tabs } from 'expo-router';

export default function CitizenTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CitizenTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="reports" options={{ title: 'Báo cáo' }} />
      <Tabs.Screen name="create" options={{ href: null, title: 'Gửi báo cáo' }} />
      <Tabs.Screen name="change-password" options={{ href: null, title: 'Đổi mật khẩu' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Thông báo' }} />
      <Tabs.Screen name="profile" options={{ title: 'Cá nhân' }} />
    </Tabs>
  );
}
