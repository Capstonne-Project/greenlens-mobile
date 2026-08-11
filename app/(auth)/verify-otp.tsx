import { getAuthDialogTop } from '@/components/auth/auth-layout';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { TapScale } from '@/components/layout/TapScale';
import { onboardingColors } from '@/components/onboarding/constants';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import type { OtpPurpose } from '@/types/auth.types';
import { getAuthErrorMessage } from '@/utils/auth-errors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OTP_LENGTH = 6;
/** Giây chờ giữa 2 lần yêu cầu OTP — tránh spam mail. */
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtpScreen() {
  const { email: emailParam, purpose: purposeParam } = useLocalSearchParams<{
    email?: string;
    purpose?: string;
  }>();
  const email = typeof emailParam === 'string' ? emailParam.trim() : '';
  const purpose = (purposeParam === 'PasswordReset' ? 'PasswordReset' : 'EmailVerification') as OtpPurpose;

  const { verifyOtp, requestOtp } = useAuth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const isComplete = otpCode.length === OTP_LENGTH;
  const isResendDisabled = cooldown > 0 || isResending || !email;

  const handleVerify = async () => {
    if (!email) {
      setError('Thiếu email — quay lại bước đăng ký.');
      return;
    }
    if (!isComplete) {
      setError(`Nhập đủ ${OTP_LENGTH} chữ số.`);
      return;
    }
    setError(null);
    setIsVerifying(true);
    try {
      await verifyOtp(email, otpCode, purpose);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(auth)/login');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Mã OTP không đúng hoặc đã hết hạn.'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResendDisabled) return;
    setError(null);
    setIsResending(true);
    try {
      await requestOtp(email, purpose);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOtpCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Không gửi lại được mã. Thử lại sau.'));
    } finally {
      setIsResending(false);
    }
  };

  const dialogTop = getAuthDialogTop('verify-otp', height);

  return (
    <SafeScreen edges={['top']} className="bg-transparent">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1">
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
              <View className="mb-7 items-center">
                <View
                  className="mb-4 h-16 w-16 items-center justify-center rounded-3xl"
                  style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
                >
                  <Ionicons name="mail-open-outline" size={28} color={onboardingColors.primary} />
                </View>
                <Text
                  className="text-center text-[28px] font-bold"
                  style={{ color: onboardingColors.primary }}
                >
                  Nhập mã xác minh
                </Text>
                <Text className="mt-2 text-center text-sm leading-5 text-textSecondary">
                  {email
                    ? `Mã gồm ${OTP_LENGTH} chữ số đã gửi tới ${email}`
                    : 'Thiếu email — quay lại bước đăng ký.'}
                </Text>
              </View>

              <OtpCodeInput
                value={otpCode}
                onChangeText={(value) => {
                  setOtpCode(value);
                  if (error) setError(null);
                }}
                length={OTP_LENGTH}
                error={error ?? undefined}
              />

              <View
                className="mt-6 overflow-hidden rounded-2xl"
                style={{
                  backgroundColor: onboardingColors.primary,
                  opacity: isComplete && !isVerifying ? 1 : 0.5,
                }}
              >
                <TapScale
                  onPress={handleVerify}
                  disabled={!isComplete || isVerifying}
                  className="h-14 items-center justify-center"
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-bold text-white">Xác nhận</Text>
                  )}
                </TapScale>
              </View>

              <View className="mt-6 flex-row items-center justify-center gap-1">
                <Text className="text-sm text-textSecondary">Chưa nhận được mã?</Text>
                <Pressable onPress={() => void handleResend()} disabled={isResendDisabled} hitSlop={8}>
                  {isResending ? (
                    <ActivityIndicator size="small" color={onboardingColors.primary} />
                  ) : (
                    <Text
                      className="text-sm font-bold"
                      style={{ color: isResendDisabled ? '#94A3B8' : onboardingColors.primary }}
                    >
                      {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại'}
                    </Text>
                  )}
                </Pressable>
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
