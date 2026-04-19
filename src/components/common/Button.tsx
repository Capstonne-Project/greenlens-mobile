import { Pressable, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary: { btn: 'bg-primary active:bg-primary-dark', text: 'text-white font-semibold' },
  outline: { btn: 'border border-primary bg-white',    text: 'text-primary font-semibold' },
  ghost:   { btn: 'bg-transparent',                    text: 'text-textSecondary' },
};

const sizes = {
  sm: { btn: 'px-3 py-2',    text: 'text-sm' },
  md: { btn: 'px-4 py-3',    text: 'text-base' },
  lg: { btn: 'px-6 py-4',    text: 'text-lg' },
};

export function Button({
  label, onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`rounded-xl items-center flex-row justify-center gap-2
        ${variants[variant].btn}
        ${sizes[size].btn}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-40' : ''}`}
    >
      {loading && <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#139B40'} />}
      <Text className={`${variants[variant].text} ${sizes[size].text}`}>{label}</Text>
    </Pressable>
  );
}
