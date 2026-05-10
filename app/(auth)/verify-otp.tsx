import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import type { OtpPurpose } from '@/types/auth.types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

export default function VerifyOtpScreen() {
  const { email: emailParam, purpose: purposeParam } = useLocalSearchParams<{
    email?: string;
    purpose?: string;
  }>();
  const email = typeof emailParam === 'string' ? emailParam : '';
  const purpose = (purposeParam === 'PasswordReset' ? 'PasswordReset' : 'EmailVerification') as OtpPurpose;

  const { verifyOtp, requestOtp } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const handleVerify = async () => {
    if (!email.trim() || code.trim().length < 6) {
      Alert.alert('Thiếu thông tin', 'Nhập email và mã OTP 6 số.');
      return;
    }
    try {
      setBusy(true);
      await verifyOtp(email.trim(), code.trim(), purpose);
      Alert.alert('Thành công', 'Email đã được xác minh. Vui lòng đăng nhập.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch {
      Alert.alert('Không thành công', 'Mã OTP không đúng hoặc đã hết hạn.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    try {
      setBusy(true);
      await requestOtp(email.trim(), purpose);
      Alert.alert('Đã gửi', 'Kiểm tra email để lấy mã mới.');
    } catch {
      Alert.alert('Lỗi', 'Không gửi được OTP. Thử lại sau.');
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

      <Text className="text-3xl font-bold text-textPrimary">Xác minh OTP</Text>
      <Text className="mt-2 text-base text-textSecondary">
        Nhập mã 6 số đã gửi tới {email || 'email của bạn'}.
      </Text>

      <View className="mt-8 gap-4">
        <View className="gap-2">
          <Text className="text-sm font-medium text-textPrimary">Mã OTP</Text>
          <Input
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
            placeholderTextColor="#94A3B8"
            className="h-14 rounded-2xl border border-border bg-white px-4 text-lg tracking-widest"
          />
        </View>

        <Button className="h-14 rounded-2xl" onPress={handleVerify} disabled={busy}>
          <Text className="font-semibold text-primary-foreground">Xác nhận</Text>
        </Button>

        <Button variant="ghost" onPress={handleResend} disabled={busy}>
          <Text className="font-semibold text-primary">Gửi lại mã</Text>
        </Button>
      </View>
    </SafeScreen>
  );
}
