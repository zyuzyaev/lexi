-- Run this in your Supabase SQL editor
-- Project: lexi

-- ── DECKS (folders) ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#c8a96e',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── CARDS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  es         text NOT NULL,
  ru         text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(es, ru)
);

-- ── CARD ↔ DECK  (many-to-many) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS card_decks (
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, deck_id)
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_card_decks_deck ON card_decks(deck_id);
CREATE INDEX IF NOT EXISTS idx_card_decks_card ON card_decks(card_id);

-- ── REALTIME ──────────────────────────────────────────────────────────────────
-- Enable realtime for all three tables in Supabase Dashboard:
-- Database → Replication → Tables → enable decks, cards, card_decks

-- ── RLS (optional, for multi-user) ───────────────────────────────────────────
-- ALTER TABLE decks  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cards  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE card_decks ENABLE ROW LEVEL SECURITY;
-- For now we keep it open (single-user app with publishable key).
