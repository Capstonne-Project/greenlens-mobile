import { ActivityIndicator, Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const variants = {
  primary: { btn: "bg-primary active:bg-primary-dark", text: "text-white font-semibold" },
  outline: { btn: "border border-primary bg-white", text: "text-primary font-semibold" },
  ghost: { btn: "bg-transparent", text: "text-textSecondary" },
};

const sizes = {
  sm: { btn: "px-3 py-2", text: "text-sm" },
  md: { btn: "px-4 py-3", text: "text-base" },
  lg: { btn: "px-6 py-4", text: "text-lg" },
};

export function Button({
  className,
  label,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
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
        disabled={isDisabled}
        className={`rounded-xl items-center flex-row justify-center gap-2
          ${variants[variant].btn}
          ${sizes[size].btn}
          ${fullWidth ? "w-full" : ""}
          ${isDisabled ? "opacity-40" : ""}`}
      >
        {loading && <ActivityIndicator size="small" color={variant === "primary" ? "#fff" : "#10B981"} />}
        <Text className={`${variants[variant].text} ${sizes[size].text}`}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
