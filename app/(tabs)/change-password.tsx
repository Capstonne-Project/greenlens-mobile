import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

/** §13 — POST /auth/change-password (Bearer) */
export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (currentPassword.length < 1 || newPassword.length < 8) {
      Alert.alert('Thiếu thông tin', 'Nhập mật khẩu hiện tại và mật khẩu mới (độ mạnh theo quy định).');
      return;
    }
    try {
      setBusy(true);
      await changePassword({ currentPassword, newPassword });
      Alert.alert('Đã đổi mật khẩu', 'Vui lòng dùng mật khẩu mới cho lần đăng nhập sau.');
      router.back();
    } catch (err) {
      Alert.alert('Không thành công', getApiErrorMessage(err, 'Đổi mật khẩu thất bại.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background px-6 pt-2">
      <Pressable
        onPress={() => router.back()}
        className="mb-6 h-10 w-10 items-center justify-center rounded-full bg-surface"
      >
        <Ionicons name="chevron-back" size={18} color="#0F172A" />
      </Pressable>

      <Text className="text-2xl font-bold text-textPrimary">Đổi mật khẩu</Text>
      <Text className="mt-2 text-base text-textSecondary">Nhập mật khẩu hiện tại và mật khẩu mới.</Text>

      <View className="mt-8 gap-4">
        <View className="gap-2">
          <Text className="text-sm font-medium text-textPrimary">Mật khẩu hiện tại</Text>
          <Input
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="••••••••"
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

        <Button className="mt-2 h-14 rounded-2xl" onPress={handleSubmit} disabled={busy}>
          <Text className="font-semibold text-primary-foreground">Xác nhận</Text>
        </Button>
      </View>
    </SafeScreen>
  );
}
