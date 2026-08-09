import { FloatingLabelInput } from '@/components/auth/FloatingLabelInput';
import { getAuthDialogTop } from '@/components/auth/auth-layout';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { onboardingColors } from '@/components/onboarding/constants';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/utils/auth-errors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (value: string): string | null => {
    if (!value) return 'Vui lòng nhập email đã đăng ký.';
    if (!EMAIL_PATTERN.test(value)) return 'Email không hợp lệ.';
    return null;
  };

  const handleSubmit = async () => {
    const value = email.trim();
    const error = validate(value);
    if (error) {
      setEmailError(error);
      return;
    }
    setEmailError(null);

    try {
      setIsSubmitting(true);
      await forgotPassword({ email: value });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/(auth)/verify-reset-otp',
        params: { email: value },
      } as Href);
    } catch (err) {
      setEmailError(getAuthErrorMessage(err, 'Không gửi được yêu cầu. Thử lại sau.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTop = getAuthDialogTop('forgot-password', height);

  return (
    <SafeScreen edges={['top']} className="bg-transparent">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1">
          {/* Dải trên để lộ quả đất của auth layout */}
          <View style={{ height: dialogTop }} className="justify-start px-4 pt-2">
            <TapScale
              onPress={() => router.back()}
              className="flex-row items-center gap-1 self-start rounded-full px-1 py-2"
            >
              <Ionicons name="chevron-back" size={20} color={onboardingColors.text} />
              <Text className="text-base font-medium" style={{ color: onboardingColors.text }}>
                Back
              </Text>
            </TapScale>
          </View>

          <Animated.View
            entering={FadeInDown.duration(320)}
            style={[styles.dialog, { paddingBottom: Math.max(insets.bottom, 16) }]}
          >
            <View className="items-center pb-4 pt-3">
              <View style={styles.grabber} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12, paddingHorizontal: 24 }}
            >
              <View className="mb-6 items-center">
                <View
                  className="mb-4 h-16 w-16 items-center justify-center rounded-3xl"
                  style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={28}
                    color={onboardingColors.primary}
                  />
                </View>
                <Text
                  className="text-center text-[28px] font-bold"
                  style={{ color: onboardingColors.primary }}
                >
                  Quên mật khẩu?
                </Text>
                <Text className="mt-2 text-center text-sm leading-5 text-textSecondary">
                  Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để bạn đặt lại mật khẩu.
                </Text>
              </View>

              <View className="gap-4">
                  <FloatingLabelInput
                    label="Email"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={() => {
                      const value = email.trim();
                      if (value) setEmailError(validate(value));
                    }}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    error={emailError ?? undefined}
                  />

                  <View
                    className="flex-row items-start gap-2.5 rounded-2xl px-4 py-3.5"
                    style={{ backgroundColor: 'rgba(34,197,94,0.08)' }}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={onboardingColors.primary}
                      style={{ marginTop: 1 }}
                    />
                    <Text className="flex-1 text-sm leading-5 text-textSecondary">
                      Vì lý do bảo mật, hệ thống không tiết lộ email có tồn tại hay không.
                    </Text>
                  </View>

                  <View
                    className="mt-1 overflow-hidden rounded-2xl"
                    style={{
                      backgroundColor: onboardingColors.primary,
                      opacity: isSubmitting ? 0.6 : 1,
                    }}
                  >
                    <TapScale
                      onPress={() => void handleSubmit()}
                      disabled={isSubmitting}
                      className="h-14 items-center justify-center"
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-base font-bold text-white">Gửi mã OTP</Text>
                      )}
                    </TapScale>
                  </View>
              </View>

              <View className="mt-8 flex-row items-center justify-center gap-1">
                <Text className="text-sm text-textSecondary">Nhớ mật khẩu rồi?</Text>
                <TapScale onPress={() => router.replace('/(auth)/login')}>
                  <Text className="text-sm font-bold" style={{ color: onboardingColors.primary }}>
                    Đăng nhập
                  </Text>
                </TapScale>
              </View>
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
