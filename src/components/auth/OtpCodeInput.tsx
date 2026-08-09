import { onboardingColors } from '@/components/onboarding/constants';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';

interface OtpCodeInputProps {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  error?: string;
  autoFocus?: boolean;
}

/**
 * Ô nhập OTP dạng nhiều khối.
 *
 * Dùng một `TextInput` ẩn phủ toàn bộ thay vì mỗi khối một input: bàn phím số của iOS/Android
 * xử lý xoá và tự động điền mã từ SMS/email đúng hơn khi chỉ có một trường thật.
 */
export function OtpCodeInput({
  value,
  onChangeText,
  length = 6,
  error,
  autoFocus = true,
}: OtpCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const digits = value.padEnd(length, ' ').slice(0, length).split('');
  // Khối đang chờ nhập — highlight để người dùng biết con trỏ ở đâu.
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View>
      <Pressable onPress={() => inputRef.current?.focus()}>
        <View className="flex-row justify-between">
          {digits.map((digit, index) => {
            const isActive = isFocused && index === activeIndex;
            const isFilled = digit.trim().length > 0;

            return (
              <View
                key={`otp-${index}`}
                className="h-14 w-[14%] items-center justify-center rounded-2xl border bg-white"
                style={{
                  borderColor: error
                    ? '#EF4444'
                    : isActive
                      ? onboardingColors.primary
                      : isFilled
                        ? '#BBF7D0'
                        : '#E5E7EB',
                  borderWidth: isActive ? 2 : 1,
                }}
              >
                <Text className="text-xl font-bold text-textPrimary">{digit.trim()}</Text>
              </View>
            );
          })}
        </View>
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={length}
        caretHidden
        // Phủ lên các khối để chạm vào đâu cũng mở bàn phím; opacity 0 nên không thấy.
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          opacity: 0,
        }}
      />

      {error ? (
        <Text className="ml-1 mt-2 text-xs" style={{ color: '#EF4444' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
