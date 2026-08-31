import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AiSourcePickSheetProps {
  visible: boolean;
  onCamera: () => void;
  onLibrary: () => void;
  onClose: () => void;
}

/** Bottom sheet "Chụp ảnh / Thư viện" mở khi chạm vào robot AI ở đầu mục Hình ảnh — trượt lên thẳng, không nảy. */
export function AiSourcePickSheet({ visible, onCamera, onLibrary, onClose }: AiSourcePickSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </View>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Animated.Text style={styles.title}>Thêm ảnh hiện trường</Animated.Text>
              <Animated.Text style={styles.subtitle}>
                AI sẽ nhận diện loại và mức độ ô nhiễm giúp bạn
              </Animated.Text>
            </View>
          </View>

          <View style={styles.optionRow}>
            <SourceOption icon="camera-outline" label="Chụp ảnh" onPress={onCamera} />
            <SourceOption icon="images-outline" label="Thư viện" onPress={onLibrary} />
          </View>

          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Animated.Text style={styles.cancelText}>Để sau</Animated.Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SourceOption({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const press = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          press.value = withSpring(0.97, { damping: 18, stiffness: 260 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 18, stiffness: 260 });
        }}
        style={styles.option}
      >
        <Ionicons name={icon} size={22} color={colors.primary} />
        <Animated.Text style={styles.optionLabel}>{label}</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  cancelBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
