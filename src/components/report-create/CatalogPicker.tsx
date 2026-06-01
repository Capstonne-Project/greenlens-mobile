import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  allowClear?: boolean;
  clearLabel?: string;
  searchPlaceholder?: string;
  onSelect: (code: string | null) => void;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
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

function OptionRow({
  title,
  description,
  selected,
  tone = 'default',
  onPress,
}: {
  title: string;
  description?: string | null;
  selected?: boolean;
  tone?: 'default' | 'muted';
  onPress: () => void;
}) {
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
        className={`border-b border-border py-3.5 ${selected ? 'bg-primary/5' : ''}`}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text
              className={`text-base font-medium ${tone === 'muted' ? 'text-textSecondary' : 'text-textPrimary'}`}
            >
              {title}
            </Text>
            {description ? <Text className="mt-0.5 text-sm text-textSecondary">{description}</Text> : null}
          </View>
          {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function CatalogPicker({
  label,
  placeholder,
  value,
  items,
  disabled = false,
  variant = 'default',
  allowClear = true,
  clearLabel = 'Bỏ chọn',
  searchPlaceholder = 'Tìm kiếm...',
  onSelect,
}: CatalogPickerProps) {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const selectedLabel = items.find((item) => item.code === value)?.label ?? null;

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const sheetHeight = useMemo(() => {
    const expandedHeight = windowHeight * 0.78;
    if (keyboardHeight <= 0) {
      return expandedHeight;
    }

    const availableHeight = windowHeight - keyboardHeight - insets.top - 12;
    return Math.min(expandedHeight, Math.max(availableHeight, windowHeight * 0.42));
  }, [insets.top, keyboardHeight, windowHeight]);

  const filteredItems = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) return items;

    return items.filter((item) => {
      const haystack = normalizeSearchText(`${item.label} ${item.description ?? ''}`);
      return haystack.includes(query);
    });
  }, [items, searchQuery]);

  const closeModal = () => {
    Keyboard.dismiss();
    setVisible(false);
    setSearchQuery('');
    setKeyboardHeight(0);
  };

  const handleSelect = (code: string | null) => {
    Keyboard.dismiss();
    onSelect(code);
    closeModal();
  };

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

      <Modal visible={visible} animationType="slide" transparent onRequestClose={closeModal}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="absolute inset-0" onPress={closeModal} accessibilityLabel="Đóng" />

          <View
            className="rounded-t-3xl bg-white px-4 pt-4"
            style={{
              height: sheetHeight,
              marginBottom: keyboardHeight,
              paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 16),
            }}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-textPrimary">{label}</Text>
              <Pressable onPress={closeModal} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View className="mb-3 flex-row items-center rounded-2xl border border-border bg-surface px-3">
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                className="h-11 flex-1 border-0 bg-transparent px-3 py-0 shadow-none"
                textAlignVertical="center"
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              ListHeaderComponent={
                allowClear && value ? (
                  <OptionRow title={clearLabel} tone="muted" onPress={() => handleSelect(null)} />
                ) : null
              }
              ListEmptyComponent={
                <View className="items-center py-8">
                  <Text className="text-sm text-textSecondary">Không tìm thấy kết quả phù hợp.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <OptionRow
                  title={item.label}
                  description={item.description}
                  selected={item.code === value}
                  onPress={() => handleSelect(item.code)}
                />
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
