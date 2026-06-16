# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Mirai.JP (artifacts/mirai-jp)
Japanese language learning mobile app built with Expo SDK 54 / React Native / expo-router v6.

**Tech Stack**: Expo SDK 54, expo-router v6, RN 0.81.5, @react-native-async-storage/async-storage, expo-speech, @tanstack/react-query, react-native-safe-area-context, react-native-gesture-handler, react-native-keyboard-controller, @expo-google-fonts/inter

**Screens** (all in `app/` — no tabs folder):
- `app/index.tsx` — Home screen with JLPT levels, industry courses, vocab search, banner carousel, AuthMenu
- `app/book-select.tsx` — Book series picker for N2/N3 (Mimikara/Soumatome)
- `app/learning-menu.tsx` — Learning type selector (vocab, grammar, kanji, guide)
- `app/vocab.tsx` — vocab study screen with Quiz, Practice, and List modes
- `app/grammar.tsx` — Grammar list screen with level/type picker
- `app/grammar-detail.tsx` — Grammar detail with structure, explanation, examples
- `app/kanji.tsx` — Kanji grid browser with filtering
- `app/kanji-detail.tsx` — Kanji detail with stroke order (KanjiStrokeOrder), readings, examples

**Components**:
- `components/AuthMenu.tsx` — Auth modal (login/register/logout), shown via menu button
- `components/ErrorBoundary.tsx` — React error boundary wrapping root
- `components/ErrorFallback.tsx` — Error UI with reload button (uses useColors, Feather icons)
- `components/FeedbackSection.tsx` — Per-page feedback/voting with AsyncStorage
- `components/KanjiStrokeOrder.tsx` — Animated kanji stroke order renderer (KanjiVG SVG paths)
- `components/KeyboardAwareScrollViewCompat.tsx` — Keyboard-aware scroll (native: keyboard-controller, web: ScrollView)

**Data**:
- `assets/vocab/` — JLPT vocab JSON files (`n5.json`, `n4.json`, `n3_mimikara.json`, `n3_soumatome.json`, `n2_mimikara.json`, `n2_soumatome.json`, `n1.json`). RawVocab shape: `{ kanji?, hira?, han?, nghia?, example?, exampleMeaning?, category? }`. Exports: `getVocab(level?, bookId?)` → `RawVocab[]`, `ALL_VOCAB`, `VOCAB_BY_BOOK`
- `assets/data_nghanh_hoc/` — Vietnamese-named industry JSON files (`thuc_pham.json`, `xay_dung.json`, `dieu_duong.json`, `nong_nghiep.json`, `khach_san.json`, `nha_hang.json`, `oto.json`, `ve_sinh.json`). Exports: `INDUSTRY_VOCAB: Record<string, RawVocab[]>`, `ALL_INDUSTRY_VOCAB`, `INDUSTRY_INFO`, `getBookInfo(level?, bookId?)`
- bookId keys: `"n5"`, `"n4"`, `"mimikara-n3"`, `"soumatome-n3"`, `"mimikara-n2"`, `"soumatome-n2"`, `"n1"`, `"industry-food"`, `"industry-construction"`, `"industry-nursing"`, `"industry-agriculture"`, `"industry-hotel"`, `"industry-restaurant"`, `"industry-auto"`, `"industry-cleaning"`
- `assets/data_JLPT_kanji/` — N1-N5 kanji JSON, `getKanji(level)`, `findKanjiById(id)` (searches by id or kanji char)
- `assets/data_nn/` — N1-N5 grammar JSON, `getGrammar(level)`, `getGrammarById(id)`

**Auth**: AsyncStorage-based auth (`hooks/useAuth.tsx`) with `AuthProvider`, `useAuth()`, `scopedKey(key)` for per-user storage namespacing

**Colors / Theming**: `constants/colors.ts` defines the design token palette. `hooks/useColors.ts` returns the active palette based on device color scheme (light-only by default). Teal `#4ECDC4`, Blue `#2F80ED`, background `#f1f5f9`

### API Server (artifacts/api-server)
Express 5 REST API server (port 8080, path `/api`). Uses Drizzle ORM + PostgreSQL, Zod validation, pino logging.

### Canvas / Mockup Sandbox (artifacts/mockup-sandbox)
Vite dev server for component preview iframes on the canvas board (port 8081, path `/__mockup`).
