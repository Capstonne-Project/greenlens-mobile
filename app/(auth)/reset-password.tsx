import { FloatingLabelInput } from '@/components/auth/FloatingLabelInput';
import { getAuthDialogTop } from '@/components/auth/auth-layout';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { onboardingColors } from '@/components/onboarding/constants';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage, requiresNewOtp } from '@/utils/auth-errors';
import { validateStrongPassword } from '@/utils/validators';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

/**
 * Bước 3 của luồng quên mật khẩu: đặt mật khẩu mới.
 *
 * `otpCode` đến từ màn `verify-reset-otp` qua params — BE xác thực mã ngay trong
 * `POST /auth/reset-password`, nên không có bước verify riêng trước đó.
 */
export default function ResetPasswordScreen() {
  const { email: emailParam, otpCode: otpParam } = useLocalSearchParams<{
    email?: string;
    otpCode?: string;
  }>();
  const email = typeof emailParam === 'string' ? emailParam.trim() : '';
  const otpCode = typeof otpParam === 'string' ? otpParam.trim() : '';

  const { resetPassword } = useAuth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const passwordError = passwordTouched ? validateStrongPassword(newPassword) : null;
  const mismatchError =
    confirmTouched && confirmPassword && confirmPassword !== newPassword
      ? 'Mật khẩu nhập lại không khớp.'
      : null;

  const canSubmit =
    Boolean(email) &&
    otpCode.length === 6 &&
    !validateStrongPassword(newPassword) &&
    confirmPassword === newPassword &&
    !busy;

  const handleSubmit = async () => {
    setPasswordTouched(true);
    setConfirmTouched(true);
    setFormError(null);

    if (!email || otpCode.length !== 6) {
      setFormError('Thiếu thông tin xác minh — quay lại bước quên mật khẩu.');
      return;
    }
    const pwdError = validateStrongPassword(newPassword);
    if (pwdError) {
      setFormError(pwdError);
      return;
    }
    if (confirmPassword !== newPassword) {
      setFormError('Mật khẩu nhập lại không khớp.');
      return;
    }

    try {
      setBusy(true);
      await resetPassword({ email, otpCode, newPassword });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Đã đặt lại mật khẩu', 'Vui lòng đăng nhập lại bằng mật khẩu mới.', [
        { text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error) {
      const message = getAuthErrorMessage(error, 'Không đặt lại được mật khẩu. Vui lòng thử lại.');
      // Mã đã hỏng thì ở lại màn này vô ích — đưa về bước nhập OTP để lấy mã mới.
      if (requiresNewOtp(error)) {
        Alert.alert('Cần mã OTP mới', message, [
          { text: 'Quay lại', onPress: () => router.back() },
        ]);
        return;
      }
      setFormError(message);
    } finally {
      setBusy(false);
    }
  };

  const dialogTop = getAuthDialogTop('reset-password', height);

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
              <View className="mb-6 items-center">
                <View
                  className="mb-4 h-16 w-16 items-center justify-center rounded-3xl"
                  style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
                >
                  <Ionicons
                    name="key-outline"
                    size={28}
                    color={onboardingColors.primary}
                  />
                </View>
                <Text
                  className="text-center text-[28px] font-bold"
                  style={{ color: onboardingColors.primary }}
                >
                  Đặt mật khẩu mới
                </Text>
                <Text className="mt-2 text-center text-sm leading-5 text-textSecondary">
                  {email
                    ? `Tạo mật khẩu mới cho ${email}`
                    : 'Thiếu email — quay lại bước quên mật khẩu.'}
                </Text>
              </View>

              <View className="gap-4">
                <View>
                  <FloatingLabelInput
                    label="Mật khẩu mới"
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setFormError(null);
                    }}
                    onBlur={() => setPasswordTouched(true)}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••"
                    error={passwordError ?? undefined}
                    rightSlot={
                      <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color="#94A3B8"
                        />
                      </Pressable>
                    }
                  />
                  {!passwordError ? (
                    <Text className="ml-1 mt-1.5 text-xs leading-4 text-textSecondary">
                      Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                    </Text>
                  ) : null}
                </View>

                <FloatingLabelInput
                  label="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setFormError(null);
                  }}
                  onBlur={() => setConfirmTouched(true)}
                  secureTextEntry={!showConfirm}
                  placeholder="••••••••"
                  error={mismatchError ?? undefined}
                  rightSlot={
                    <Pressable onPress={() => setShowConfirm((prev) => !prev)} hitSlop={8}>
                      <Ionicons
                        name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#94A3B8"
                      />
                    </Pressable>
                  }
                />

                {formError ? (
                  <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#FEF2F2' }}>
                    <Text className="text-sm leading-5" style={{ color: '#EF4444' }}>
                      {formError}
                    </Text>
                  </View>
                ) : null}

                <View
                  className="mt-1 overflow-hidden rounded-2xl"
                  style={{
                    backgroundColor: onboardingColors.primary,
                    opacity: canSubmit ? 1 : 0.5,
                  }}
                >
                  <TapScale
                    onPress={() => void handleSubmit()}
                    disabled={!canSubmit}
                    className="h-14 items-center justify-center"
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-base font-bold text-white">Xác nhận</Text>
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
