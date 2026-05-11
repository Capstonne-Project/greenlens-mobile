---
name: react-native-reusables:validation
description: Validation checklist and anti-patterns for app-specific components built with react-native-reusables style in Expo/React Native projects.
---

# React Native Reusables - Validation

Use this sub-skill to review quality, consistency, and regression risk for reusables-style components.

## Validation Checklist

### Structure & Types
- [ ] File is in correct domain folder under `src/components/`
- [ ] Named export used (no default export in `src/`)
- [ ] Props use TypeScript interface (no `any`)
- [ ] Variant props are explicit and have defaults

### Styling & Tokens
- [ ] Uses design tokens (`bg-primary`, `text-primary`, `border-border`)
- [ ] No hard-coded hex in className
- [ ] No arbitrary spacing/color unless justified

### Interaction & Animation
- [ ] Every interactive `Pressable` has Reanimated press feedback
- [ ] No React Native legacy `Animated` API
- [ ] Tap targets remain usable and layout stable while pressed

### Loading & Lists
- [ ] List items have skeleton state if fetched remotely
- [ ] FlatList item components use `React.memo` where appropriate
- [ ] Event handlers passed to list items are stable when possible

### Safety
- [ ] Error UI does not expose raw backend internals
- [ ] No hidden global assumptions (theme, store, nav) without explicit props/context

## Anti-Patterns

### ❌ Missing press animation

```tsx
<Pressable onPress={onPress} className="rounded-xl bg-primary p-3">
  <Text>Open</Text>
</Pressable>
```

Must include Reanimated scale/feedback behavior.

### ❌ Spinner-only list loading

```tsx
if (isLoading) return <ActivityIndicator />;
```

For fetched lists, provide skeleton placeholders.

### ❌ Untyped or weakly typed props

```tsx
interface CardProps {
  data: any;
}
```

Use explicit domain shape or minimal typed fields.

## Review Priority

1. **Critical:** type safety + press animation + no legacy Animated
2. **High:** token consistency + skeleton loading for list flows
3. **Medium:** memoization and stable callback patterns
