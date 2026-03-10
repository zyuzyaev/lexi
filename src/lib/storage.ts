import type { CardWithDecks, Deck } from "./supabase";

const KEYS = {
  cards:       "lexi_cards_v3",
  decks:       "lexi_decks_v1",
  score:       "lexi_score_v1",
  weights:     "lexi_weights_v1",
  theme:       "lexi_theme",
  activeDeck:  "lexi_active_deck", // "all" | deck_id
} as const;

// ── Generic helpers ──────────────────────────────────────────────────────────

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Typed accessors ──────────────────────────────────────────────────────────

export const storage = {
  getCards:      () => get<CardWithDecks[]>(KEYS.cards, []),
  setCards:      (v: CardWithDecks[]) => set(KEYS.cards, v),

  getDecks:      () => get<Deck[]>(KEYS.decks, []),
  setDecks:      (v: Deck[]) => set(KEYS.decks, v),

  getScore:      () => get<{ know: number; skip: number }>(KEYS.score, { know: 0, skip: 0 }),
  setScore:      (v: { know: number; skip: number }) => set(KEYS.score, v),

  getWeights:    () => get<Record<string, number>>(KEYS.weights, {}),  // card_id → weight
  setWeights:    (v: Record<string, number>) => set(KEYS.weights, v),

  getTheme:      () => get<"light" | "dark">(KEYS.theme, "light"),
  setTheme:      (v: "light" | "dark") => set(KEYS.theme, v),

  getActiveDeck: () => get<string>(KEYS.activeDeck, "all"),
  setActiveDeck: (v: string) => set(KEYS.activeDeck, v),
};
