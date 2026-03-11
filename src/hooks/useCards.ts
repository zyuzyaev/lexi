import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, type CardWithDecks } from "@/lib/supabase";
import { storage } from "@/lib/storage";

export function useCards() {
  const [cards, setCardsState]   = useState<CardWithDecks[]>(() => storage.getCards());
  const [loading, setLoading]     = useState(true);
  const [syncError, setSyncError] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const setCards = useCallback((next: CardWithDecks[]) => {
    setCardsState(next);
    storage.setCards(next);
  }, []);

  // ── Fetch + merge remote with local ──────────────────────────────────────
  // Local cards go first so that any cards added offline are preserved.
  // Remote cards that don't exist locally get appended.
  // After merge, any local-only cards are pushed up to Supabase.

  const fetchAll = useCallback(async () => {
    const [{ data: cardsData, error: cardsErr }, { data: cdData }] = await Promise.all([
      supabase.from("cards").select("*").order("created_at"),
      supabase.from("card_decks").select("*"),
    ]);

    if (cardsErr || !cardsData) {
      setSyncError(true);
      return;
    }

    setSyncError(false);

    const deckMap: Record<string, string[]> = {};
    (cdData ?? []).forEach(({ card_id, deck_id }) => {
      if (!deckMap[card_id]) deckMap[card_id] = [];
      deckMap[card_id].push(deck_id);
    });

    const remote: CardWithDecks[] = cardsData.map(c => ({
      ...c,
      deck_ids: deckMap[c.id] ?? [],
    }));

    // Merge: local cards first, then any remote cards not already present
    const localCards = storage.getCards();
    const remoteKeys = new Set(remote.map(c => `${c.es}|${c.ru}`.toLowerCase()));
    const localOnly  = localCards.filter(c => !remoteKeys.has(`${c.es}|${c.ru}`.toLowerCase()));

    // Push local-only cards to Supabase (offline queue flush)
    if (localOnly.length) {
      await supabase
        .from("cards")
        .upsert(localOnly.map(c => ({ es: c.es, ru: c.ru })), { onConflict: "es,ru" })
        .then(() => {/* best-effort */});
    }

    setCards(remote);
  }, [setCards]);

  // ── Initial load + realtime ───────────────────────────────────────────────

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));

    channelRef.current = supabase
      .channel("cards-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "card_decks" }, fetchAll)
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [fetchAll]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const addCard = useCallback(async (
    es: string,
    ru: string,
    deckIds: string[] = [],
  ): Promise<CardWithDecks | null> => {
    es = es.trim(); ru = ru.trim();

    // upsert so duplicates don't error
    const { data: card, error } = await supabase
      .from("cards")
      .upsert({ es, ru }, { onConflict: "es,ru" })
      .select()
      .single();

    if (error || !card) return null;

    // assign to decks
    if (deckIds.length) {
      await supabase
        .from("card_decks")
        .upsert(deckIds.map(deck_id => ({ card_id: card.id, deck_id })));
    }

    await fetchAll();
    return { ...card, deck_ids: deckIds };
  }, [fetchAll]);

  const updateCard = useCallback(async (
    id: string,
    patch: { es?: string; ru?: string },
    deckIds?: string[],
  ): Promise<boolean> => {
    if (patch.es || patch.ru) {
      const { error } = await supabase.from("cards").update(patch).eq("id", id);
      if (error) return false;
    }

    if (deckIds !== undefined) {
      // replace all deck memberships
      await supabase.from("card_decks").delete().eq("card_id", id);
      if (deckIds.length) {
        await supabase
          .from("card_decks")
          .insert(deckIds.map(deck_id => ({ card_id: id, deck_id })));
      }
    }

    await fetchAll();
    return true;
  }, [fetchAll]);

  const deleteCard = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) return false;
    setCards(cards.filter(c => c.id !== id));
    return true;
  }, [cards, setCards]);

  // Filtered view: "all" or by deck_id
  const cardsForDeck = useCallback((deckId: "all" | string): CardWithDecks[] => {
    if (deckId === "all") return cards;
    return cards.filter(c => c.deck_ids.includes(deckId));
  }, [cards]);

  return { cards, loading, syncError, addCard, updateCard, deleteCard, cardsForDeck, refetch: fetchAll };
}
