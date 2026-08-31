import { FloatingLabelInput } from '@/components/auth/FloatingLabelInput';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { onboardingColors } from '@/components/onboarding/constants';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { getPostLoginHref } from '@/utils/post-login-route';
import { validateStrongPassword } from '@/utils/validators';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * BR: account do Company tạo (CM tạo CompanyStaff) có mật khẩu tạm — BE trả
 * `user.mustChangePassword: true` sau login. Bắt đổi mật khẩu trước khi vào app,
 * không cho back về login (đã có session hợp lệ, chỉ thiếu bước này).
 */
export default function ForceChangePasswordScreen() {
  const { changePassword } = useAuth();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
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
    currentPassword.length > 0 &&
    !validateStrongPassword(newPassword) &&
    confirmPassword === newPassword &&
    !busy;

  const handleSubmit = async () => {
    setPasswordTouched(true);
    setConfirmTouched(true);
    setFormError(null);

    if (!currentPassword) {
      setFormError('Nhập mật khẩu tạm đã được cấp.');
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
      await changePassword({ currentPassword, newPassword });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (user) setUser({ ...user, mustChangePassword: false });
      // Xem comment tương tự trong login.tsx — tách dismissAll() và replace() ra 2 tick
      // để tránh Fabric nhận 2 batch mount/unmount chồng nhau ("View already has a parent").
      if (router.canDismiss()) router.dismissAll();
      setTimeout(() => {
        router.replace(getPostLoginHref(user?.role ?? 'Citizen'));
      }, 0);
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Không đổi được mật khẩu. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeScreen edges={['top']} className="bg-white">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24, paddingHorizontal: 24, paddingTop: 32 }}
        >
          <Animated.View entering={FadeInDown.duration(320)}>
            <View className="mb-6 items-center">
              <View
                className="mb-4 h-16 w-16 items-center justify-center rounded-3xl"
                style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
              >
                <Ionicons name="shield-checkmark-outline" size={28} color={onboardingColors.primary} />
              </View>
              <Text className="text-center text-[26px] font-bold" style={{ color: onboardingColors.primary }}>
                Đặt mật khẩu mới
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-textSecondary">
                Tài khoản của bạn được cấp mật khẩu tạm. Vui lòng đặt mật khẩu mới trước khi tiếp tục.
              </Text>
            </View>

            <View className="gap-4">
              <FloatingLabelInput
                label="Mật khẩu tạm (đã cấp)"
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setFormError(null);
                }}
                secureTextEntry={!showCurrent}
                placeholder="••••••••"
                rightSlot={
                  <Pressable onPress={() => setShowCurrent((prev) => !prev)} hitSlop={8}>
                    <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94A3B8" />
                  </Pressable>
                }
              />

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
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94A3B8" />
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
                label="Nhập lại mật khẩu mới"
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
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94A3B8" />
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
                style={{ backgroundColor: onboardingColors.primary, opacity: canSubmit ? 1 : 0.5 }}
              >
                <TapScale onPress={() => void handleSubmit()} disabled={!canSubmit} className="h-14 items-center justify-center">
                  {busy ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text className="text-base font-bold text-white">Xác nhận</Text>
                  )}
                </TapScale>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
