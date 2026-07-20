import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

export interface EvidencePhoto {
  uri: string;
}

interface EvidencePhotoPickerProps {
  images: EvidencePhoto[];
  minimum: number;
  maximum: number;
  onTakePhoto: () => void;
  onChooseLibrary: () => void;
  onRemove: (index: number) => void;
  processing?: boolean;
}

interface PhotoActionProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}

function PhotoAction({
  label,
  icon,
  onPress,
  primary = false,
  disabled = false,
}: PhotoActionProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, { flex: 1 }]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        }}
        className="h-12 flex-row items-center justify-center gap-2 rounded-xl border"
        style={{
          backgroundColor: disabled
            ? colors.surface
            : primary
              ? colors.primary
              : colors.white,
          borderColor: disabled
            ? colors.border
            : primary
              ? colors.primary
              : colors.border,
        }}
      >
        <Ionicons
          name={icon}
          size={18}
          color={disabled ? colors.textDisabled : primary ? colors.white : colors.textPrimary}
        />
        <Text
          className="text-sm font-semibold"
          style={{
            color: disabled ? colors.textDisabled : primary ? colors.white : colors.textPrimary,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

interface PhotoTileProps {
  uri: string;
  index: number;
  onRemove: () => void;
}

function PhotoTile({ uri, index, onRemove }: PhotoTileProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="relative aspect-square w-[31%] overflow-visible">
      <Image
        source={{ uri }}
        className="h-full w-full rounded-xl bg-surface"
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5">
        <Text className="text-[10px] font-semibold text-white">Ảnh {index + 1}</Text>
      </View>
      <Animated.View style={[animatedStyle, { position: 'absolute', right: -6, top: -6 }]}>
        <Pressable
          accessibilityLabel={`Xóa ảnh ${index + 1}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onRemove}
          onPressIn={() => {
            scale.value = withSpring(0.9, { damping: 18, stiffness: 320 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 18, stiffness: 320 });
          }}
          className="h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-textPrimary"
        >
          <Ionicons name="close" size={14} color={colors.white} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function EvidencePhotoPicker({
  images,
  minimum,
  maximum,
  onTakePhoto,
  onChooseLibrary,
  onRemove,
  processing = false,
}: EvidencePhotoPickerProps) {
  const remaining = Math.max(0, minimum - images.length);
  const reachedMaximum = images.length >= maximum;

  return (
    <View>
      <View className="mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-base font-bold text-textPrimary">Bằng chứng hiện trường</Text>
          <Text className="mt-0.5 text-xs text-textSecondary">
            Tối thiểu {minimum}, tối đa {maximum} ảnh
          </Text>
        </View>
        <Text
          className="text-sm font-bold"
          style={{ color: remaining === 0 ? colors.primary : colors.textSecondary }}
        >
          {images.length}/{maximum}
        </Text>
      </View>

      {images.length > 0 ? (
        <View className="mb-4 flex-row flex-wrap gap-3">
          {images.map((image, index) => (
            <PhotoTile
              key={`${image.uri}-${index}`}
              uri={image.uri}
              index={index}
              onRemove={() => onRemove(index)}
            />
          ))}
        </View>
      ) : (
        <View className="mb-4 items-center rounded-xl border border-dashed border-border bg-surface px-5 py-8">
          <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
          <Text className="mt-2 text-sm font-semibold text-textPrimary">Chưa có ảnh</Text>
          <Text className="mt-1 text-center text-xs leading-4 text-textSecondary">
            Chụp rõ toàn cảnh và khu vực cần đối chiếu.
          </Text>
        </View>
      )}

      {remaining > 0 ? (
        <Text className="mb-3 text-xs font-medium" style={{ color: colors.warning }}>
          Cần thêm {remaining} ảnh để tiếp tục
        </Text>
      ) : null}

      <View className="flex-row gap-2">
        <PhotoAction
          label={processing ? 'Đang xử lý' : 'Chụp ảnh'}
          icon="camera"
          onPress={onTakePhoto}
          primary
          disabled={processing || reachedMaximum}
        />
        <PhotoAction
          label="Thư viện"
          icon="images-outline"
          onPress={onChooseLibrary}
          disabled={processing || reachedMaximum}
        />
      </View>
    </View>
  );
}
