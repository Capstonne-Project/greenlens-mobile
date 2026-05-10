import { SafeScreen } from "@/components/layout/SafeScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/utils/api-error-message";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

interface TapItemProps {
  onPress: () => void;
  className?: string;
  children: React.ReactNode;
}

function TapItem({ onPress, className, children }: TapItemProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 260 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 260 });
        }}
        className={className}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    passwordStrength <= 1 ? "Yếu" : passwordStrength === 2 ? "Trung bình" : passwordStrength === 3 ? "Khá" : "Mạnh";

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập họ tên, email và mật khẩu.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Mật khẩu không khớp", "Ô xác nhận mật khẩu phải giống với mật khẩu bạn vừa nhập.");
      return;
    }

    if (!acceptTerms) {
      Alert.alert("Điều khoản", "Bạn cần đồng ý điều khoản dịch vụ để tiếp tục.");
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
        pathname: "/(auth)/verify-otp",
        params: { email: email.trim(), purpose: "EmailVerification" },
      });
    } catch (err) {
      Alert.alert("Đăng ký thất bại", getApiErrorMessage(err, "Không thể đăng ký. Thử lại sau."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background px-6">
      <View className="flex-1 justify-center">
        <TapItem
          onPress={() => router.back()}
          className="mb-4 h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={18} color="#0F172A" />
        </TapItem>

        <Text className="text-4xl font-bold text-textPrimary">Tạo tài khoản mới</Text>
        <Text className="mt-2 text-base text-textSecondary">Đầy đủ để tích điểm và xếp hạng</Text>

        <View className="mt-8 px-5 gap-4">
          <View className="gap-2">
            <Text className="text-sm font-medium text-textPrimary">Họ và tên</Text>
            <View className="h-14 flex-row items-center rounded-2xl border border-border bg-white px-3">
              <Ionicons name="person-outline" size={18} color="#94A3B8" />
              <Input
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#94A3B8"
                className="h-full flex-1 border-0 bg-transparent px-3 py-0 shadow-none"
                textAlignVertical="center"
              />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-textPrimary">Email</Text>
            <View className="h-14 flex-row items-center rounded-2xl border border-border bg-white px-3">
              <Ionicons name="mail-outline" size={18} color="#94A3B8" />
              <Input
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="vana@example.com"
                placeholderTextColor="#94A3B8"
                className="h-full flex-1 border-0 bg-transparent px-3 py-0 shadow-none"
              />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-textPrimary">Mật khẩu</Text>
            <View className="h-14 flex-row items-center rounded-2xl border border-border bg-white px-3">
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
              <Input
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#94A3B8"
                className="h-full flex-1 border-0 bg-transparent px-3 py-0 shadow-none"
              />
              <TapItem onPress={() => setShowPassword((prev) => !prev)} className="p-1.5">
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
              </TapItem>
            </View>

            <View className="mt-1 flex-row items-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < passwordStrength ? "bg-primary" : "bg-border"}`}
                />
              ))}
            </View>
            <Text className="text-sm text-textSecondary">Độ mạnh: {strengthText} - cần thêm ký tự đặc biệt</Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-textPrimary">Xác nhận mật khẩu</Text>
            <View className="h-14 flex-row items-center rounded-2xl border border-border bg-white px-3">
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="#94A3B8"
                className="h-full flex-1 border-0 bg-transparent px-3 py-0 shadow-none"
              />
              <TapItem onPress={() => setShowConfirmPassword((prev) => !prev)} className="p-1.5">
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
              </TapItem>
            </View>
          </View>

          <TapItem onPress={() => setAcceptTerms((prev) => !prev)} className="mt-1 flex-row items-start gap-3">
            <View className="mt-0.5 h-5 w-5 items-center justify-center rounded border border-border bg-white">
              {acceptTerms && <View className="h-3 w-3 rounded-sm bg-primary" />}
            </View>
            <Text className="flex-1 text-sm leading-5 text-textSecondary">
              Tôi đồng ý với <Text className="font-semibold text-primary">Điều khoản dịch vụ</Text> và{" "}
              <Text className="font-semibold text-primary">Chính sách bảo mật</Text>.
            </Text>
          </TapItem>

          <Button onPress={handleRegister} disabled={isSubmitting} className="mt-2 h-14 rounded-3xl">
            <Text className="text-base font-semibold text-primary-foreground">
              {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </Text>
          </Button>
        </View>
      </View>
    </SafeScreen>
  );
}
