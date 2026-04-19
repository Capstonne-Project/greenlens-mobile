import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SafeScreenProps {
  children: React.ReactNode;
  className?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function SafeScreen({ children, className = '', edges = ['top', 'bottom'] }: SafeScreenProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-white">
      <View className={`flex-1 ${className}`}>{children}</View>
    </SafeAreaView>
  );
}
