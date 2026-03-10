import { createClient } from "@supabase/supabase-js";

// ── DB types ──────────────────────────────────────────────────────────────────

export interface Deck {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Card {
  id: string;
  es: string;
  ru: string;
  created_at: string;
}

export interface CardDeck {
  card_id: string;
  deck_id: string;
}

// Card enriched with which decks it belongs to (used in UI)
export interface CardWithDecks extends Card {
  deck_ids: string[];
}

export type Database = {
  public: {
    Tables: {
      decks:      { Row: Deck;     Insert: Omit<Deck, "id" | "created_at">;     Update: Partial<Omit<Deck, "id">> };
      cards:      { Row: Card;     Insert: Omit<Card, "id" | "created_at">;     Update: Partial<Omit<Card, "id">> };
      card_decks: { Row: CardDeck; Insert: CardDeck;                             Update: never };
    };
  };
};

// ── Client ────────────────────────────────────────────────────────────────────

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_KEY as string;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY in .env.local");
}

export const supabase = createClient<Database>(url, key);
