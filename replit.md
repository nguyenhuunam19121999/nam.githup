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

**Screens**:
- `app/(tabs)/index.tsx` — Home screen with JLPT levels, industry courses, vocab search, banner carousel
- `app/book-select.tsx` — Book series picker for N2/N3 (Mimikara/Soumatome)
- `app/learning-menu.tsx` — Learning type selector (vocab, grammar, kanji, guide)
- `app/flashcard.tsx` — Flashcard study screen with Quiz, Practice, and List modes
- `app/grammar.tsx` — Grammar list screen with level/type picker
- `app/grammar-detail.tsx` — Grammar detail with structure, explanation, examples
- `app/kanji.tsx` — Kanji grid browser with radical/component filtering
- `app/kanji-detail.tsx` — Kanji detail with stroke order, readings, examples

**Data**:
- `assets/data_JLPT_kanji/` — N1-N5 kanji JSON, `getKanji(level)`, `findKanjiById(id)` (searches by id or kanji char)
- `assets/data_nn/` — N1-N5 grammar JSON, `getGrammar(level)`, `getGrammarById(id)`
- `assets/data_nghanh_hoc/` — Industry vocab JSON (food/construction/nursing/agriculture/hotel/restaurant/auto/cleaning/IT/business/finance/education), `getBookInfo(level?, bookId?)`
- `assets/vocab/index.ts` — `getVocab(level?, bookId?)` → `RawVocab[]`, `ALL_VOCAB`

**Auth**: AsyncStorage-based auth (`hooks/useAuth.tsx`) with `AuthProvider`, `useAuth()`, `scopedKey(key)` for per-user storage namespacing

**Colors**: Teal `#4ECDC4`, Blue `#2F80ED`, background `#f1f5f9`

### API Server (artifacts/api-server)
Express 5 REST API server (port 8080, path `/api`). Uses Drizzle ORM + PostgreSQL, Zod validation, pino logging.

### Canvas / Mockup Sandbox (artifacts/mockup-sandbox)
Vite dev server for component preview iframes on the canvas board (port 8081, path `/__mockup`).
