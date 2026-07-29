import { CitizenTabBar } from '@/components/layout/CitizenTabBar';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { Tabs } from 'expo-router';

export default function CitizenTabsLayout() {
  useRoleGuard('citizen');

  return (
    <Tabs
      tabBar={(props) => <CitizenTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="reports" options={{ title: 'Báo cáo' }} />
      <Tabs.Screen name="create" options={{ href: null, title: 'Gửi báo cáo' }} />
      <Tabs.Screen name="settings" options={{ href: null, title: 'Cài đặt' }} />
      <Tabs.Screen name="change-password" options={{ href: null, title: 'Đổi mật khẩu' }} />
      <Tabs.Screen name="edit-profile" options={{ href: null, title: 'Chỉnh sửa hồ sơ' }} />
      {/* Thông báo mở từ NotificationBell trên header, không còn là tab */}
      <Tabs.Screen name="notifications" options={{ href: null, title: 'Thông báo' }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'BXH' }} />
      <Tabs.Screen name="profile" options={{ title: 'Hồ sơ' }} />
    </Tabs>
  );
}
