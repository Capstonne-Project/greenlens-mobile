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
  rightSlot?: React.ReactNode;
}

function FloatingLabelInputComponent({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  rightSlot,
}: FloatingLabelInputProps) {
  const [focused, setFocused] = useState(false);
  const accent = focused ? onboardingColors.primary : '#86EFAC';

  return (
    <View className="relative mt-2">
      <View
        className="min-h-[56px] flex-row items-center rounded-2xl border bg-white px-4"
        style={{ borderColor: focused ? onboardingColors.primary : '#BBF7D0' }}
      >
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A0AEC0"
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
  );
}

export const FloatingLabelInput = memo(FloatingLabelInputComponent);
