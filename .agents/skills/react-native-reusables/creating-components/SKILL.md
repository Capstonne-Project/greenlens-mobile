---
name: react-native-reusables:creating-components
description: Step-by-step guide for creating app-specific React Native components with reusables style, NativeWind, strict TypeScript, and Reanimated press interactions.
---

# React Native Reusables - Creating Components

Use this sub-skill when building app-owned components in `src/components/` that are not ideal as strict framework primitives.

## Component Creation Workflow

### Step 1: Confirm Reusables Is Correct Choice

Choose reusables when component is:
- app-specific (report card, map callout, filter block, empty state)
- layout-custom and frequently changed
- best expressed with NativeWind className composition

If component is primitive/form-heavy (Button/Input/Form/Modal/Select), use gluestack instead.

### Step 2: Choose Domain Folder

- `src/components/common/` shared UI blocks
- `src/components/report/` report feature components
- `src/components/map/` map-related components
- `src/components/layout/` page layout wrappers

### Step 3: Define Props Interface First

Rules:
- Use `interface`, never `any`
- Prefer explicit unions (`variant`, `size`, `tone`)
- Keep safe defaults in function params

### Step 4: Build with Reanimated Press Feedback

```tsx
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ReportCardProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  variant?: 'default' | 'warning';
}

export function ReportCard({
  title,
  subtitle,
  onPress,
  variant = 'default',
}: ReportCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rootClass =
    variant === 'warning'
      ? 'rounded-2xl border border-border bg-surface p-4'
      : 'rounded-2xl border border-border bg-white p-4';

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        className={rootClass}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
      >
        <Text className="text-textPrimary text-base font-semibold">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-textSecondary text-sm">{subtitle}</Text>
        ) : null}
        <View />
      </Pressable>
    </Animated.View>
  );
}
```

### Step 5: Add Skeleton for List Components

If the component appears in fetched lists, export a skeleton variant:

```tsx
export function ReportCardSkeleton() {
  return <View className="h-24 rounded-2xl bg-surface" />;
}
```

## Practical Rules

1. Named export only for `src/components/*`.
2. No hard-coded hex in className; use tokens (`bg-primary`, `text-primary`, `border-border`).
3. Keep composition local and copy-safe; no hidden coupling.
4. Wrap heavy list items with `React.memo`.
5. Never use legacy `Animated` API.

## Output Contract

After creation, report:
- chosen path
- component export names
- primary props and supported variants
- whether skeleton was added
