import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

/** §12 — đặt lại mật khẩu sau forgot-password (OTP qua email) */
export default function ResetPasswordScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';

  const { resetPassword } = useAuth();
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || otpCode.trim().length < 6 || newPassword.length < 8) {
      Alert.alert('Thiếu thông tin', 'Nhập email, OTP và mật khẩu mới (≥8 ký tự, có hoa/thường/số/ký tự đặc biệt).');
      return;
    }
    try {
      setBusy(true);
      await resetPassword({
        email: email.trim(),
        otpCode: otpCode.trim(),
        newPassword,
      });
      Alert.alert('Đã đặt lại mật khẩu', 'Vui lòng đăng nhập lại.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch {
      Alert.alert('Không thành công', 'OTP hoặc mật khẩu không hợp lệ.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background px-6">
      <Pressable
        onPress={() => router.back()}
        className="mb-8 mt-2 h-10 w-10 items-center justify-center rounded-full bg-surface"
      >
        <Ionicons name="chevron-back" size={18} color="#0F172A" />
      </Pressable>

      <Text className="text-3xl font-bold text-textPrimary">Đặt mật khẩu mới</Text>
      <Text className="mt-2 text-base text-textSecondary">
        Email: {email || '(thiếu — quay lại bước quên mật khẩu)'}
      </Text>

      <View className="mt-8 gap-4">
        <View className="gap-2">
          <Text className="text-sm font-medium text-textPrimary">Mã OTP</Text>
          <Input
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
            placeholderTextColor="#94A3B8"
            className="h-14 rounded-2xl border border-border bg-white px-4"
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-medium text-textPrimary">Mật khẩu mới</Text>
          <Input
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            className="h-14 rounded-2xl border border-border bg-white px-4"
          />
        </View>

        <Button className="h-14 rounded-2xl" onPress={handleSubmit} disabled={busy}>
          <Text className="font-semibold text-primary-foreground">Xác nhận</Text>
        </Button>
      </View>
    </SafeScreen>
  );
}
