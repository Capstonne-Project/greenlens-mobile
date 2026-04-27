import { Button } from "@/components/common/Button";
import { SafeScreen } from "@/components/layout/SafeScreen";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
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
  const [email, setEmail] = useState("nguyenvana@email.com");
  const [password, setPassword] = useState("12345678");
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
    <SafeScreen className="bg-surface px-5 pt-3">
      <View className="flex-1 mt-3">
        <TapItem onPress={() => router.back()} className="w-full mb-7 size-32 items-start rounded-full bg-border/40">
          <Ionicons name="chevron-back" size={18} color="#6B7280" />
        </TapItem>

        <Text className="text-4xl font-bold text-textPrimary">Xin chào</Text>
        <Text className="mt-2 text-base text-textSecondary">Đăng nhập để tiếp tục đóng góp cho cộng đồng</Text>

        <View className="mt-8 gap-5">
          <View className="gap-2">
            <Text className="text-sm font-medium text-textPrimary">Email hoặc Số điện thoại</Text>
            <View className="flex-row items-center rounded-full border border-border bg-surface px-4">
              <View className="mr-2.5">
                <Ionicons name="person-outline" size={18} color="#94A3B8" />
              </View>
              <View className="flex-1">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="h-14 py-0 text-base leading-5 text-textPrimary"
                  placeholder="nguyenvana@email.com"
                  placeholderTextColor="#D1D5DB"
                  textAlignVertical="center"
                  style={{ paddingTop: 0, paddingBottom: 0 }}
                />
              </View>
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-textPrimary">Mật khẩu</Text>
            <View className="flex-row items-center rounded-full border border-border bg-surface px-4">
              <View className="mr-2.5">
                <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
              </View>
              <View className="flex-1">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  className="h-14 py-0 text-base leading-5 text-textPrimary"
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#D1D5DB"
                  textAlignVertical="center"
                  style={{ paddingTop: 0, paddingBottom: 0 }}
                />
              </View>
              <TapItem onPress={() => setShowPassword((prev) => !prev)} className="ml-1 p-1">
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
              </TapItem>
            </View>
          </View>

          <View className="mt-0.5 flex-row items-center justify-between">
            <TapItem onPress={() => setRememberMe((prev) => !prev)} className="flex-row items-center gap-2">
              <View className={`size-4 rounded-md ${rememberMe ? "bg-primary" : "border border-border bg-white"}`} />
              <Text className="text-sm text-textSecondary">Ghi nhớ</Text>
            </TapItem>
            <TapItem onPress={() => Alert.alert("Sắp có", "Tính năng quên mật khẩu sẽ được cập nhật sau.")}>
              <Text className="text-sm font-semibold text-primary">Quên mật khẩu?</Text>
            </TapItem>
          </View>

          <Button label="Đăng nhập" onPress={handleLogin} loading={isSubmitting} fullWidth />

          <View className="my-1.5 flex-row items-center">
            <View className="h-px flex-1 bg-border" />
            <Text className="mx-3 text-xs uppercase text-textSecondary">Hoặc</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <TapItem
            onPress={() => Alert.alert("Sắp có", "Tính năng đăng nhập Google sẽ được cập nhật sau.")}
            className="w-full flex-row items-center justify-center gap-2.5 rounded-xl border border-border bg-white py-3.5"
          >
            <Ionicons name="globe-outline" size={18} color="#374151" />
            <Text className="text-base font-semibold text-textPrimary">Tiếp tục với Google</Text>
          </TapItem>

          <TapItem
            onPress={() => Alert.alert("Ẩn danh", "Bạn có thể tiếp tục ẩn danh ở phiên bản tiếp theo.")}
            className="items-center py-2"
          >
            <View className="flex-row items-center gap-2.5">
              <Ionicons name="eye-off-outline" size={18} color="#6B7280" />
              <Text className="text-base font-medium text-textPrimary">Tiếp tục ẩn danh</Text>
            </View>
          </TapItem>
        </View>
      </View>

      <View className="pb-2 pt-4">
        <Text className="text-center text-sm text-textSecondary">
          Chưa có tài khoản?{" "}
          <Text onPress={() => router.push("/(auth)/onboarding")} className="font-semibold text-primary">
            Đăng ký ngay
          </Text>
        </Text>
      </View>
    </SafeScreen>
  );
}
