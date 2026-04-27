import { SafeScreen } from "@/components/layout/SafeScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
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

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ email/số điện thoại và mật khẩu.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email, password });
      Alert.alert("Đăng nhập thành công", "Bạn đã đăng nhập thành công.");
    } catch {
      Alert.alert("Đăng nhập thất bại", "Thông tin đăng nhập chưa đúng hoặc hệ thống đang bận.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background px-5">
      <View className="flex-1 justify-center">
        <Text className="text-4xl  font-bold text-textPrimary">Xin chào</Text>
        <Text className="mt-2 text-base text-textSecondary">Đăng nhập để tiếp tục đóng góp cho cộng đồng</Text>

        <View className="mt-8 gap-5 rounded-3xl bg-surface p-5">
          <View className="gap-2">
            <Text className="text-sm font-medium text-textPrimary">Email hoặc Số điện thoại</Text>
            <View className="h-14 flex-row items-center rounded-2xl border border-border bg-white px-3">
              <Ionicons name="person-outline" size={18} color="#94A3B8" />
              <Input
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="nguyenvana@email.com"
                placeholderTextColor="#94A3B8"
                className="h-full flex-1 border-0 bg-transparent px-3 py-0 shadow-none"
                textAlignVertical="center"
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
                textContentType="password"
              />
              <TapItem onPress={() => setShowPassword((prev) => !prev)} className="p-1.5">
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
              </TapItem>
            </View>
          </View>

          <View className="mt-0.5 flex-row items-center justify-between">
            <TapItem onPress={() => setRememberMe((prev) => !prev)} className="flex-row items-center gap-2">
              <View className="size-4 items-center justify-center rounded bg-white border border-border">
                {rememberMe && <View className="size-2.5 rounded-sm bg-primary" />}
              </View>
              <Text className="text-sm text-textSecondary">Ghi nhớ</Text>
            </TapItem>
            <TapItem onPress={() => Alert.alert("Sắp có", "Tính năng quên mật khẩu sẽ được cập nhật sau.")}>
              <Text className="text-sm font-semibold text-primary">Quên mật khẩu?</Text>
            </TapItem>
          </View>

          <Button onPress={handleLogin} disabled={isSubmitting} className="h-16 rounded-3xl">
            <Text className="text-base font-semibold text-primary-foreground">
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Text>
          </Button>

          <View className="my-1.5 flex-row items-center">
            <View className="h-px flex-1 bg-border" />
            <Text className="mx-3 text-xs uppercase text-textSecondary">Hoặc</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <TapItem
            onPress={() => Alert.alert("Sắp có", "Tính năng đăng nhập Google sẽ được cập nhật sau.")}
            className="w-full flex-row items-center justify-center gap-2.5 rounded-2xl border border-border bg-white py-3.5"
          >
            <Ionicons name="globe-outline" size={18} color="#334155" />
            <Text className="text-base font-semibold text-textPrimary">Tiếp tục với Google</Text>
          </TapItem>

          <TapItem
            onPress={() => Alert.alert("Ẩn danh", "Bạn có thể tiếp tục ẩn danh ở phiên bản tiếp theo.")}
            className="items-center py-2"
          >
            <View className="flex-row items-center gap-2.5">
              <Ionicons name="eye-off-outline" size={18} color="#64748B" />
              <Text className="text-base font-medium text-textPrimary">Tiếp tục ẩn danh</Text>
            </View>
          </TapItem>
        </View>
        <View className="pt-5">
          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-textSecondary">Chưa có tài khoản?</Text>
            <TapItem onPress={() => router.push("/(auth)/onboarding")}>
              <Text className="text-sm font-semibold text-primary">Đăng ký ngay</Text>
            </TapItem>
          </View>
        </View>
      </View>
    </SafeScreen>
  );
}
