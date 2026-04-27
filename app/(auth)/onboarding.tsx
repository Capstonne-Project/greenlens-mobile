import { Button } from "@/components/common/Button";
import { SafeScreen } from "@/components/layout/SafeScreen";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, ScrollView, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  icon: string;
  cardClassName: string;
  isSplash?: boolean;
}

const ONBOARDING_ITEMS: OnboardingItem[] = [
  {
    id: "splash",
    title: "GreenWatch",
    subtitle: "Cùng bảo vệ môi trường Việt Nam",
    description: "",
    icon: "💧",
    cardClassName: "bg-emerald-500",
    isSplash: true,
  },
  {
    id: "onb1",
    title: "Phát hiện ô nhiễm xung quanh bạn",
    description:
      "Bản đồ thời gian thực hiển thị các điểm ô nhiễm, hotspot và báo cáo từ cộng đồng gần khu vực của bạn.",
    icon: "📍",
    cardClassName: "bg-emerald-100",
  },
  {
    id: "onb2",
    title: "Báo cáo chỉ với vài thao tác",
    description: "Chụp ảnh, chọn vị trí và mô tả ngắn gọn. GPS và AI sẽ hỗ trợ bạn tự động.",
    icon: "📷",
    cardClassName: "bg-lime-100",
  },
  {
    id: "onb3",
    title: "Nhận điểm, huy hiệu và ghi nhận",
    description: "Mỗi báo cáo hợp lệ mang lại điểm thưởng, huy hiệu và cơ hội lên bảng xếp hạng cộng đồng.",
    icon: "🏆",
    cardClassName: "bg-amber-100",
  },
];

const SCREEN_WIDTH = Dimensions.get("window").width;
const SPLASH_DURATION_MS = 1800;

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const rotation = useSharedValue(0);

  const isLastItem = useMemo(() => activeIndex === ONBOARDING_ITEMS.length - 1, [activeIndex]);
  const isSplashScreen = ONBOARDING_ITEMS[activeIndex]?.isSplash;

  useEffect(() => {
    if (!isSplashScreen) return;

    rotation.value = 0;
    rotation.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);

    const timeoutId = setTimeout(() => {
      const nextIndex = 1;
      scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
      setActiveIndex(nextIndex);
    }, SPLASH_DURATION_MS);

    return () => {
      clearTimeout(timeoutId);
      rotation.value = 0;
    };
  }, [isSplashScreen, rotation]);

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const goToLogin = () => {
    router.replace("/(auth)/login");
  };

  const goToNext = () => {
    if (isLastItem) {
      goToLogin();
      return;
    }

    const nextIndex = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
    setActiveIndex(nextIndex);
  };

  return (
    <SafeScreen className={isSplashScreen ? "bg-emerald-500" : "bg-white"}>
      {!isSplashScreen && (
        <View className="flex-row items-center justify-between px-6 pt-2">
          <View className="flex-row items-center gap-2">
            {ONBOARDING_ITEMS.filter((item) => !item.isSplash).map((item, index) => (
              <View
                key={item.id}
                className={`h-1.5 rounded-full ${activeIndex - 1 === index ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
              />
            ))}
          </View>
          <View className="w-20">
            <Button  label="Bỏ qua" variant="ghost" size="md" onPress={goToLogin} fullWidth />
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={!isSplashScreen}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveIndex(nextIndex);
        }}
      >
        {ONBOARDING_ITEMS.map((item) => (
          <View
            key={item.id}
            style={{ width: SCREEN_WIDTH }}
            className={`px-6 ${item.isSplash ? "justify-center pb-8 pt-10" : "pb-6 pt-4"}`}
          >
            {item.isSplash ? (
              <View className="flex-1 items-center justify-center">
                <View className="size-20 items-center justify-center rounded-full bg-white/20">
                  <Text className="text-4xl">💧</Text>
                </View>
                <Text className="mt-6 text-4xl font-bold text-white">{item.title}</Text>
                <Text className="mt-2 text-base text-white/80">{item.subtitle}</Text>
                <Animated.View
                  style={[
                    progressStyle,
                    {
                      marginTop: 80,
                      width: 72,
                      height: 72,
                      borderRadius: 999,
                      borderWidth: 8,
                      borderColor: "rgba(255,255,255,0.25)",
                      borderTopColor: "#FFFFFF",
                    },
                  ]}
                />
              </View>
            ) : (
              <>
                <View className={`h-96 w-full items-center justify-center rounded-3xl ${item.cardClassName}`}>
                  <Text className="text-7xl">{item.icon}</Text>
                </View>

                <View className="mt-8 gap-3 px-1">
                  <Text className="text-3xl font-bold leading-tight text-textPrimary">{item.title}</Text>
                  <Text className="text-lg leading-7 text-textSecondary">{item.description}</Text>
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>

      {!isSplashScreen && (
        <View className="px-6 pb-8">
          <Button label={isLastItem ? "Bắt đầu" : "Tiếp theo"} onPress={goToNext} fullWidth />
        </View>
      )}
    </SafeScreen>
  );
}
