# Mobile Bootstrap Guide

## Base structure

- `app/`: Expo Router screens/layouts only.
- `src/components`: common/report/map/layout UI domains.
- `src/hooks`: data and UI hooks.
- `src/services`: Axios API layer.
- `src/stores`: Zustand client state.
- `src/types`: shared TypeScript contracts.
- `src/theme`: tokens and visual constants.
- `src/utils`: helpers and validators.
- `assets/images`: app icons, splash, and static images.

## Add new module checklist

1. Add types to `src/types/<domain>.types.ts`.
2. Add API calls in `src/services/<domain>.service.ts`.
3. Add hook in `src/hooks/use<Domain>.ts`.
4. Add UI in `src/components/<domain>/`.
5. Add route screen in `app/` only when needed.

## Config checklist

- Keep `app.json` image paths in sync with `assets/images`.
- Keep `tsconfig.json` include list aligned with env typing files.
- Keep NativeWind wiring intact in `babel.config.js`, `metro.config.js`, `global.css`, and `nativewind-env.d.ts`.
- Use `.env.example` as source-of-truth for required public environment variables.
