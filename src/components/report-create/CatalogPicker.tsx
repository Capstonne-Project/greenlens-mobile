import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors } from '@/theme/colors';

interface CatalogPickerItem {
  code: string;
  label: string;
  description?: string | null;
}

interface CatalogPickerProps {
  label: string;
  placeholder: string;
  value: string | null;
  items: CatalogPickerItem[];
  disabled?: boolean;
  variant?: 'default' | 'section';
  onSelect: (code: string) => void;
}

function FieldLabel({ label, variant }: { label: string; variant: 'default' | 'section' }) {
  if (variant === 'section') {
    return (
      <Text className="px-1 text-xs font-semibold uppercase tracking-[1.2px] text-textSecondary">{label}</Text>
    );
  }

  return <Text className="text-sm font-semibold text-textPrimary">{label}</Text>;
}

function PickerRow({
  label,
  placeholder,
  value,
  disabled,
  variant,
  onPress,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  disabled?: boolean;
  variant: 'default' | 'section';
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rowClassName =
    variant === 'section'
      ? 'flex-row items-center justify-between rounded-2xl bg-white px-4 py-3.5'
      : 'flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5';

  return (
    <View className={variant === 'section' ? 'gap-2' : 'gap-2'}>
      <FieldLabel label={label} variant={variant} />
      <Animated.View style={animatedStyle} className={variant === 'section' ? 'mt-0' : undefined}>
        <Pressable
          disabled={disabled}
          onPress={onPress}
          onPressIn={() => {
            scale.value = withSpring(0.98, { damping: 18, stiffness: 260 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 18, stiffness: 260 });
          }}
          className={rowClassName}
          style={{ opacity: disabled ? 0.5 : 1 }}
        >
          <Text className={`flex-1 text-base ${value ? 'text-textPrimary' : 'text-textSecondary'}`}>
            {value ?? placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function CatalogPicker({
  label,
  placeholder,
  value,
  items,
  disabled = false,
  variant = 'default',
  onSelect,
}: CatalogPickerProps) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = items.find((item) => item.code === value)?.label ?? null;

  return (
    <>
      <PickerRow
        label={label}
        placeholder={placeholder}
        value={selectedLabel}
        disabled={disabled}
        variant={variant}
        onPress={() => setVisible(true)}
      />

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[70%] rounded-t-3xl bg-white px-4 pb-6 pt-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-textPrimary">{label}</Text>
              <Pressable onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.code);
                    setVisible(false);
                  }}
                  className="border-b border-border py-3.5"
                >
                  <Text className="text-base font-medium text-textPrimary">{item.label}</Text>
                  {item.description ? (
                    <Text className="mt-0.5 text-sm text-textSecondary">{item.description}</Text>
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
