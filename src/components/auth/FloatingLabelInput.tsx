import { Input } from '@/components/ui/input';
import { memo, useState } from 'react';
import { Text, View } from 'react-native';
import { onboardingColors } from '@/components/onboarding/constants';

interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoComplete?: 'email' | 'password' | 'name' | 'off';
  rightSlot?: React.ReactNode;
  /** Gọi khi rời ô nhập — dùng cho validate inline. */
  onBlur?: () => void;
  /** Message lỗi; có giá trị thì viền và label chuyển đỏ. */
  error?: string;
}

const ERROR_COLOR = '#EF4444';

function FloatingLabelInputComponent({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  autoComplete,
  rightSlot,
  onBlur,
  error,
}: FloatingLabelInputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? ERROR_COLOR
    : focused
      ? onboardingColors.primary
      : '#BBF7D0';
  const accent = error ? ERROR_COLOR : focused ? onboardingColors.primary : '#86EFAC';

  return (
    <View className="mt-2">
      <View className="relative">
        <View
          className="min-h-[56px] flex-row items-center rounded-2xl border bg-white px-4"
          style={{ borderColor }}
        >
          <Input
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#A0AEC0"
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            autoComplete={autoComplete}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            className="h-14 flex-1 border-0 bg-transparent px-0 py-0 text-base text-textPrimary shadow-none"
          />
          {rightSlot}
        </View>
        <View className="absolute -top-2 left-4 bg-white px-1.5">
          <Text className="text-xs font-semibold" style={{ color: accent }}>
            {label}
          </Text>
        </View>
      </View>
      {error ? (
        <Text className="ml-1 mt-1.5 text-xs" style={{ color: ERROR_COLOR }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export const FloatingLabelInput = memo(FloatingLabelInputComponent);
