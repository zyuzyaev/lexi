# Lexi — ES ⇄ RU Flashcards

Minimal spaced-repetition flashcard app. Spanish ↔ Russian, organized in folders, synced via Supabase.

## Stack

- **React 18** + **TypeScript**
- **Vite** + **vite-plugin-pwa** (installable on iOS/Android)
- **Supabase** — Postgres + Realtime + REST
- CSS Modules (zero UI library)

## Quick start

```bash
# 1. Install
npm install

# 2. Configure (your Supabase creds are already in .env.local)
# VITE_SUPABASE_URL and VITE_SUPABASE_KEY

# 3. Run DB migration
# Paste supabase/migrations/001_init.sql into Supabase → SQL Editor → Run

# 4. Dev server
npm run dev

# 5. Build
npm run build
```

## Deploy to Vercel (recommended)

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`
4. Deploy → get `https://lexi.vercel.app`

## Install on iPhone

1. Open `https://lexi.vercel.app` in **Safari**
2. Tap **Share → Add to Home Screen**
3. Done — launches fullscreen, no browser UI

## Project structure

```
src/
  lib/         supabase client + localStorage helpers
  hooks/       useCards, useDecks, useSession
  components/  Card, BottomSheet, Toast, ConfirmDialog
  screens/     Study, CardList, Stats
  styles/      CSS tokens (design system)
supabase/
  migrations/  001_init.sql
```

## DB schema

```
decks      id, name, color, created_at
cards      id, es, ru, created_at  (UNIQUE es,ru)
card_decks card_id → deck_id  (many-to-many)
```

## Features

- ✅ Spaced repetition (weighted random — hard cards appear more often)  
- ✅ Folders / decks with color coding  
- ✅ Study all cards or a specific folder  
- ✅ Realtime sync across devices  
- ✅ Offline support (localStorage cache + PWA)  
- ✅ Edit / delete any card inline  
- ✅ Swipe gestures on mobile (→ know, ← skip)  
- ✅ Dark mode  
- ✅ Haptic feedback  
- ✅ Keyboard shortcuts (Space, →, ↑↓, E)
