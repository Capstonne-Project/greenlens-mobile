import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="gap-1">
      {label && <Text className="text-sm font-medium text-textPrimary">{label}</Text>}
      <TextInput
        className={`bg-surface border rounded-xl px-4 py-3 text-base text-textPrimary
          ${error ? 'border-error' : 'border-border'}
          ${props.editable === false ? 'opacity-50' : ''}`}
        placeholderTextColor="#D1D5DB"
        {...props}
      />
      {error && <Text className="text-xs text-error">{error}</Text>}
    </View>
  );
}
