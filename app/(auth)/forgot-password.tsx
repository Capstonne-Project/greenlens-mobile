import { SafeScreen } from "@/components/layout/SafeScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/utils/api-error-message";
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

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const [credential, setCredential] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendRecoveryLink = async () => {
    const email = credential.trim();
    if (!email) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập email đã đăng ký.");
      return;
    }

    try {
      setIsSubmitting(true);
      await forgotPassword({ email });
      Alert.alert(
        "Đã xử lý",
        "Nếu email tồn tại trong hệ thống, bạn sẽ nhận mã OTP để đặt lại mật khẩu.",
        [
          {
            text: "Tiếp tục",
            onPress: () =>
              router.push({
                pathname: "/(auth)/reset-password",
                params: { email },
              }),
          },
        ],
      );
    } catch (err) {
      Alert.alert("Lỗi", getApiErrorMessage(err, "Không gửi được yêu cầu. Thử lại sau."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeScreen className="flex-1 bg-background px-5">
      <View className="flex-1 pt-2">
        <TapItem
          onPress={() => router.back()}
          className="mb-12 h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={18} color="#0F172A" />
        </TapItem>

        <Text className="text-4xl font-bold text-textPrimary">Khôi phục mật khẩu</Text>
        <Text className="mt-2 text-base leading-6 text-textSecondary">
          Nhập email đã đăng ký. Hệ thống sẽ gửi mã OTP (theo chính sách bảo mật, không tiết lộ email có tồn tại hay không).
        </Text>

        <View className="mt-10 gap-4">
          <View className="gap-2">
            <Text className="text-sm font-medium text-textPrimary">Email</Text>
            <View className="h-14 flex-row items-center rounded-2xl border border-border bg-white px-3">
              <Ionicons name="person-outline" size={18} color="#94A3B8" />
              <Input
                value={credential}
                onChangeText={setCredential}
                autoCapitalize="none"
                placeholder="vana@example.com"
                placeholderTextColor="#94A3B8"
                className="h-full flex-1 border-0 bg-transparent px-3 py-0 shadow-none"
              />
            </View>
          </View>

          <View className="flex-row items-start gap-2 rounded-2xl border border-primary bg-primaryLight px-3 py-3">
            <Ionicons name="time-outline" size={16} color="#10B981" />
            <Text className="flex-1 text-sm leading-5 text-textPrimary">
              Link sẽ hết hạn sau <Text className="font-semibold text-primary">15 phút</Text>. Bạn có tối đa{" "}
              <Text className="font-semibold text-primary">3 lần</Text> yêu cầu/giờ.
            </Text>
          </View>

          <Button onPress={handleSendRecoveryLink} disabled={isSubmitting} className="mt-2 h-16 rounded-3xl">
            <Text className="text-base font-semibold text-primary-foreground">
              {isSubmitting ? "Đang gửi..." : "Gửi mã OTP"}
            </Text>
          </Button>

          <TapItem onPress={() => router.replace("/(auth)/login")} className="items-center py-3">
            <Text className=" font-semibold text-textPrimary">Quay lại đăng nhập</Text>
          </TapItem>
        </View>
      </View>
    </SafeScreen>
  );
}
