import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DotLottie } from '@lottiefiles/dotlottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import ROBOT_SOURCE from '../../../assets/robot/ai-assistant.lottie';

const MESSAGES = [
  'AI hỗ trợ phân tích ô nhiễm ✨',
  'Chỉ cần 1 tấm ảnh, xong ngay!',
];

const TYPE_MS_PER_CHAR = 10;
const HOLD_MS = 1500;
const ERASE_MS_PER_CHAR = 5;

interface AiRobotHeroProps {
  disabled?: boolean;
  onPress: () => void;
}

/**
 * Robot AI đứng độc lập, căn giữa trên đầu wizard tạo báo cáo — không nền, kèm bong bóng
 * chat phía trên gõ chữ như đang nhắn tin thật. Bấm vào mở sheet chọn ảnh.
 */
export function AiRobotHero({ disabled = false, onPress }: AiRobotHeroProps) {
  const press = useSharedValue(1);
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [float]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 + float.value * -3 }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(0.97, { damping: 18, stiffness: 260 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 18, stiffness: 260 });
      }}
      style={[styles.column, disabled ? { opacity: 0.6 } : null]}
    >
      <ChatBubble />

      <Animated.View style={[floatStyle, pressStyle]}>
        <DotLottie source={ROBOT_SOURCE} autoplay loop style={styles.robot} />
      </Animated.View>
    </Pressable>
  );
}

/** Gõ từng ký tự như đang nhắn tin, giữ lại một nhịp, rồi xoá dần sang câu kế tiếp. */
function ChatBubble() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'holding' | 'erasing'>('typing');
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 260, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 260, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [cursorOpacity]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tailOpacity = useSharedValue(1);

  useEffect(() => {
    const currentText = MESSAGES[messageIndex] ?? '';

    if (phase === 'typing') {
      if (visibleChars < currentText.length) {
        tailOpacity.value = 0.15;
        tailOpacity.value = withTiming(1, { duration: TYPE_MS_PER_CHAR * 1.4, easing: Easing.out(Easing.quad) });
        timeoutRef.current = setTimeout(() => setVisibleChars((n) => n + 1), TYPE_MS_PER_CHAR);
      } else {
        timeoutRef.current = setTimeout(() => setPhase('holding'), HOLD_MS);
      }
    } else if (phase === 'holding') {
      timeoutRef.current = setTimeout(() => setPhase('erasing'), 0);
    } else {
      if (visibleChars > 0) {
        timeoutRef.current = setTimeout(() => setVisibleChars((n) => n - 1), ERASE_MS_PER_CHAR);
      } else {
        setMessageIndex((i) => (i + 1) % MESSAGES.length);
        setPhase('typing');
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase, visibleChars, messageIndex, tailOpacity]);

  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOpacity.value }));
  const tailStyle = useAnimatedStyle(() => ({ opacity: tailOpacity.value }));
  const fullText = MESSAGES[messageIndex] ?? '';
  const typedText = fullText.slice(0, Math.max(visibleChars - 1, 0));
  const newestChar = visibleChars > 0 ? fullText.slice(visibleChars - 1, visibleChars) : '';

  return (
    <View style={styles.bubbleWrap}>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText} numberOfLines={1}>
          {typedText}
          <Animated.Text style={tailStyle}>{newestChar}</Animated.Text>
          <Animated.Text style={[styles.cursor, cursorStyle]}>|</Animated.Text>
        </Text>
      </View>
      <View style={styles.bubbleTailOuter}>
        <View style={styles.bubbleTailInner} />
      </View>
    </View>
  );
}

const ROBOT_SIZE = 92;

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
  },
  robot: {
    width: ROBOT_SIZE,
    height: ROBOT_SIZE,
  },
  bubbleWrap: {
    alignItems: 'center',
    marginBottom: 2,
  },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 6.5,
    paddingHorizontal: 12,
    minHeight: 30,
    minWidth: 90,
    maxWidth: 300,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  bubbleTailOuter: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
    alignSelf: 'flex-start',
    marginLeft: 13,
    marginTop: -1.5,
  },
  bubbleTailInner: {
    position: 'absolute',
    top: -8,
    left: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 0,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.white,
  },
  bubbleText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cursor: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: colors.primary,
  },
});
