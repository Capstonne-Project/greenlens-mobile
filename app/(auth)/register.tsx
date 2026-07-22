import { FloatingLabelInput } from '@/components/auth/FloatingLabelInput';
import { AUTH_LOGIN_DIALOG_TOP_RATIO } from '@/components/auth/auth-layout';
import { TapScale } from '@/components/layout/TapScale';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Text } from '@/components/ui/text';
import { onboardingColors } from '@/components/onboarding/constants';
import { useAuth } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) || /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthText =
    passwordStrength <= 1
      ? 'Weak'
      : passwordStrength === 2
        ? 'Fair'
        : passwordStrength === 3
          ? 'Good'
          : 'Strong';

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên, email và mật khẩu.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Ô xác nhận mật khẩu phải giống với mật khẩu bạn vừa nhập.');
      return;
    }

    if (!acceptTerms) {
      Alert.alert('Điều khoản', 'Bạn cần đồng ý điều khoản dịch vụ để tiếp tục.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email: email.trim(), purpose: 'EmailVerification' },
      });
    } catch (err) {
      Alert.alert('Đăng ký thất bại', getApiErrorMessage(err, 'Không thể đăng ký. Thử lại sau.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Slightly tighter top band so more fields fit while keeping earth visible.
  const dialogTop = Math.max(height * Math.min(AUTH_LOGIN_DIALOG_TOP_RATIO, 0.32), 190);

  return (
    <SafeScreen edges={['top']} className="bg-transparent">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1">
          <View style={{ height: dialogTop }} className="justify-start px-4 pt-2">
            <TapScale
              onPress={() => router.replace('/(auth)/login')}
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
                Get Started
              </Text>

              <View className="gap-5">
                <FloatingLabelInput
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter Full Name"
                  autoCapitalize="words"
                />

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

                <View className="mt-[-6px] flex-row items-center gap-1.5 px-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < passwordStrength ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  ))}
                </View>
                <Text className="mt-[-10px] text-xs text-textSecondary">Strength: {strengthText}</Text>

                <FloatingLabelInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter Password"
                  secureTextEntry={!showConfirmPassword}
                  rightSlot={
                    <TapScale
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      className="p-1.5"
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
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

              <TapScale onPress={handleRegister} className="mt-6">
                <View
                  className="h-14 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor:
                      acceptTerms && !isSubmitting ? onboardingColors.primary : '#86EFAC',
                    opacity: isSubmitting ? 0.8 : 1,
                  }}
                >
                  <Text className="text-base font-semibold text-white">
                    {isSubmitting ? 'Signing up...' : 'Sign up'}
                  </Text>
                </View>
              </TapScale>

              <View className="mt-7 flex-row items-center">
                <View className="h-px flex-1 bg-border" />
                <Text className="mx-3 text-sm text-textSecondary">Sign up with</Text>
                <View className="h-px flex-1 bg-border" />
              </View>

              <View className="mt-5 items-center">
                <TapScale
                  onPress={() =>
                    Alert.alert('Sắp có', 'Tính năng đăng ký Google sẽ được cập nhật sau.')
                  }
                  className="h-14 w-14 items-center justify-center rounded-full border border-border bg-white"
                >
                  <Ionicons name="logo-google" size={24} color="#EA4335" />
                </TapScale>
              </View>

              <View className="mt-8 flex-row items-center justify-center gap-1">
                <Text className="text-sm text-textSecondary">Already have an account?</Text>
                <TapScale onPress={() => router.replace('/(auth)/login')}>
                  <Text className="text-sm font-bold" style={{ color: onboardingColors.primary }}>
                    Sign in
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
