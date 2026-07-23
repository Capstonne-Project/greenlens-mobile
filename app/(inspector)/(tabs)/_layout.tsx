import { Tabs } from 'expo-router';

import { InspectorTabBar } from '@/components/layout/InspectorTabBar';

export default function InspectorTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <InspectorTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="queue" options={{ title: 'Hồ sơ' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Thông báo' }} />
      <Tabs.Screen name="profile" options={{ title: 'Cá nhân' }} />
    </Tabs>
  );
}
