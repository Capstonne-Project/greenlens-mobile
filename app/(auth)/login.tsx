import { FloatingLabelInput } from '@/components/auth/FloatingLabelInput';
import { getAuthDialogTop } from '@/components/auth/auth-layout';
import { TapScale } from '@/components/layout/TapScale';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { onboardingColors } from '@/components/onboarding/constants';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { getPostLoginHref } from '@/utils/post-login-route';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const {
    isAvailable: isGoogleAvailable,
    isSigningIn: isGoogleSigningIn,
    errorMessage: googleError,
    clearError: clearGoogleError,
    signIn: signInWithGoogle,
  } = useGoogleSignIn();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    if (!acceptTerms) {
      Alert.alert('Điều khoản', 'Bạn cần đồng ý điều khoản sử dụng để đăng nhập.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login({ email, password });
      // Session cũ có thể đã được restore vào shell khác (vd. (inspector)) trước
      // khi user login lại — dismiss stack đó rồi mới sang shell của role mới.
      if (router.canDismiss()) router.dismissAll();
      if (user.mustChangePassword) {
        router.replace('/(auth)/force-change-password');
        return;
      }
      router.replace(getPostLoginHref(user.role));
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        'Đăng nhập thất bại. Kiểm tra kết nối hoặc thử lại sau.'
      );
      Alert.alert('Đăng nhập thất bại', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearGoogleError();
    const user = await signInWithGoogle();
    if (!user) return; // huỷ hoặc lỗi — hook đã set errorMessage
    if (router.canDismiss()) router.dismissAll();
    router.replace(getPostLoginHref(user.role));
  };

  const dialogTop = getAuthDialogTop('login', height);

  return (
    // Only top safe-area — dialog paints into bottom inset so nền không lộ.
    <SafeScreen edges={['top']} className="bg-transparent">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1">
          <View style={{ height: dialogTop }} className="justify-start px-4 pt-2">
            <TapScale
              onPress={() => router.replace('/(auth)/onboarding')}
              className="flex-row items-center gap-1 self-start rounded-full px-1 py-2"
            >
              <Ionicons name="chevron-back" size={20} color={onboardingColors.text} />
              <Text className="text-base font-medium" style={{ color: onboardingColors.text }}>
                Back
              </Text>
            </TapScale>
          </View>

          <Animated.View
            entering={FadeInDown.duration(450)}
            style={[
              styles.dialog,
              {
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View className="items-center pb-4 pt-3">
              <View style={styles.grabber} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12, paddingHorizontal: 24 }}
            >
              <Text
                className="mb-6 text-center text-[28px] font-bold"
                style={{ color: onboardingColors.primary }}
              >
                Sign in
              </Text>

              <View className="gap-5">
                <FloatingLabelInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <FloatingLabelInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter Password"
                  secureTextEntry={!showPassword}
                  rightSlot={
                    <TapScale onPress={() => setShowPassword((prev) => !prev)} className="p-1.5">
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#94A3B8"
                      />
                    </TapScale>
                  }
                />
              </View>

              <TapScale
                onPress={() => setAcceptTerms((prev) => !prev)}
                className="mt-5 flex-row items-center gap-3"
              >
                <View
                  className="h-5 w-5 items-center justify-center rounded-[5px]"
                  style={{
                    backgroundColor: acceptTerms ? onboardingColors.primary : '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: onboardingColors.primary,
                  }}
                >
                  {acceptTerms ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                </View>
                <Text className="flex-1 text-sm leading-5 text-textSecondary">
                  I agree to the processing of{' '}
                  <Text className="font-semibold" style={{ color: onboardingColors.primary }}>
                    Personal data
                  </Text>
                </Text>
              </TapScale>

              <TapScale onPress={handleLogin} className="mt-6">
                <View
                  className="h-14 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor:
                      acceptTerms && !isSubmitting ? onboardingColors.primary : '#86EFAC',
                    opacity: isSubmitting ? 0.8 : 1,
                  }}
                >
                  <Text className="text-base font-semibold text-white">
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                  </Text>
                </View>
              </TapScale>

              <View className="mt-7 flex-row items-center">
                <View className="h-px flex-1 bg-border" />
                <Text className="mx-3 text-sm text-textSecondary">Sign in with</Text>
                <View className="h-px flex-1 bg-border" />
              </View>

              <View
                className="mt-5 items-center"
                style={{ opacity: isGoogleSigningIn || isSubmitting ? 0.5 : 1 }}
              >
                <TapScale
                  onPress={() => {
                    if (!isGoogleAvailable) {
                      Alert.alert(
                        'Chưa khả dụng',
                        'Đăng nhập Google chưa được cấu hình. Vui lòng dùng email và mật khẩu.',
                      );
                      return;
                    }
                    void handleGoogleLogin();
                  }}
                  className="h-14 w-14 items-center justify-center rounded-full border border-border bg-white"
                >
                  {isGoogleSigningIn ? (
                    <ActivityIndicator size="small" color="#EA4335" />
                  ) : (
                    <Ionicons name="logo-google" size={24} color="#EA4335" />
                  )}
                </TapScale>

                {googleError ? (
                  <Text className="mt-3 px-4 text-center text-sm" style={{ color: '#EF4444' }}>
                    {googleError}
                  </Text>
                ) : null}
              </View>

              <View className="mt-8 flex-row items-center justify-center gap-1">
                <Text className="text-sm text-textSecondary">Don&apos;t have an account?</Text>
                <TapScale onPress={() => router.push('/(auth)/register')}>
                  <Text className="text-sm font-bold" style={{ color: onboardingColors.primary }}>
                    Sign up
                  </Text>
                </TapScale>
              </View>

              <TapScale
                onPress={() => router.push('/(auth)/forgot-password')}
                className="mt-4 items-center"
              >
                <Text className="text-sm font-semibold text-primary">Forgot password?</Text>
              </TapScale>
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  dialog: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },
});
