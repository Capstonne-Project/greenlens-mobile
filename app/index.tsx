import { colors } from '@/theme/colors';
import { useAuth } from '@/hooks/useAuth';
import { getPostLoginHref } from '@/utils/post-login-route';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isAuthenticated && user) {
    return <Redirect href={getPostLoginHref(user.role)} />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}
