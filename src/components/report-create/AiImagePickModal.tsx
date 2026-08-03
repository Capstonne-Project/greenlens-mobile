import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

interface AiImagePickModalItem {
  uri: string;
}

interface AiImagePickModalProps {
  visible: boolean;
  items: AiImagePickModalItem[];
  onSelect: (index: number) => void;
  onSkip: () => void;
}

/** Khi user chọn nhiều ảnh cùng lúc, AI chỉ phân tích được 1 ảnh — bắt user chọn ảnh rõ nhất thay vì tự động lấy ảnh đầu. */
export function AiImagePickModal({ visible, items, onSelect, onSkip }: AiImagePickModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="rounded-t-3xl bg-white px-5 pt-5 pb-8">
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <View className="mb-4 flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="sparkles" size={18} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-textPrimary">Chọn ảnh để AI phân tích</Text>
              <Text className="text-xs text-textSecondary">
                Bạn đã chọn {items.length} ảnh — hãy chọn ảnh rõ nét nhất để AI nhận diện
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {items.map((item, index) => (
              <Pressable
                key={`${item.uri}-${index}`}
                onPress={() => onSelect(index)}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <Image source={{ uri: item.uri }} style={{ width: 96, height: 96 }} contentFit="cover" />
                <View className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-white">{index + 1}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable onPress={onSkip} className="mt-5 items-center rounded-2xl bg-surface py-3.5">
            <Text className="text-base font-semibold text-textSecondary">Bỏ qua AI, tự điền phân loại</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
