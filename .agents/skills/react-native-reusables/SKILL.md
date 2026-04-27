---
name: react-native-reusables
description: Guides component creation with react-native-reusables style for Expo/React Native projects. Use when building app-specific UI components with NativeWind className, copy-paste ownership, and fast customization. Includes creating-components and validation sub-skills.
---

# React Native Reusables Patterns

Use this skill when implementing UI that should be owned directly in app code and customized quickly without heavy framework constraints.

## When to Prefer Reusables

- App-specific component (cards, list items, filters, empty states, banners)
- Feature-specific UI with frequent visual changes
- NativeWind-first styling and copy-paste ownership
- Need fast custom composition over strict compound API

## When Not to Prefer Reusables

- Standard primitives already better served by gluestack (Button/Input/Form/Modal/Select)
- Shared form semantics where strict API prevents misuse
- Cases requiring deep built-in accessibility contracts from a UI framework

## Implementation Rules

1. Use TypeScript `interface` for all props; never use `any`.
2. Keep components copy-safe: no hidden global assumptions.
3. Use design tokens in className (`bg-primary`, `text-primary`, `border-border`), avoid hard-coded hex.
4. Any `Pressable` must include Reanimated press feedback.
5. For list fetching states, provide skeleton component instead of spinner-only behavior.
6. Keep variants explicit with controlled props (`variant`, `size`, `tone`) and safe defaults.

## Recommended Base Pattern

```tsx
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface AppCardProps {
  title: string;
  onPress?: () => void;
  variant?: 'default' | 'warning';
}

export function AppCard({
  title,
  onPress,
  variant = 'default',
}: AppCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerClass =
    variant === 'warning'
      ? 'rounded-2xl border border-border bg-surface p-4'
      : 'rounded-2xl border border-border bg-white p-4';

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        onPress={onPress}
        className={containerClass}
      >
        <View>{/* content */}</View>
      </Pressable>
    </Animated.View>
  );
}
```

## Validation Checklist

- [ ] Correct domain path in `src/components/<domain>/`
- [ ] Named export, typed props interface
- [ ] Press animation present for interactive component
- [ ] Token-based colors only
- [ ] Optional skeleton exported if used in list loading flow
- [ ] No React Native legacy `Animated` API

## Sub-Skills

Use focused sub-skills for better consistency:

- `react-native-reusables:creating-components` for scaffolding new app-specific components.
- `react-native-reusables:validation` for review checklists and anti-pattern detection.
