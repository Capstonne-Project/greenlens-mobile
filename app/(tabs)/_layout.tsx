import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconsName;
  activeName: IoniconsName;
  color: string;
  focused: boolean;
  size: number;
}

function TabIcon({ name, activeName, color, focused, size }: TabIconProps) {
  return <Ionicons name={focused ? activeName : name} size={size} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:           false,
        tabBarActiveTintColor: '#139B40',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor:  '#E5E7EB',
          height:          60,
          paddingBottom:   8,
          paddingTop:      4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: (p) => <TabIcon {...p} name="home-outline" activeName="home" />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Bản đồ',
          tabBarIcon: (p) => <TabIcon {...p} name="map-outline" activeName="map" />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Báo cáo',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              size={size + 6}
              color="#139B40"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
          tabBarIcon: (p) => <TabIcon {...p} name="notifications-outline" activeName="notifications" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: (p) => <TabIcon {...p} name="person-outline" activeName="person" />,
        }}
      />
    </Tabs>
  );
}
