import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, type CardWithDecks } from "@/lib/supabase";
import { storage } from "@/lib/storage";

export function useCards() {
  const [cards, setCardsState]   = useState<CardWithDecks[]>(() => storage.getCards());
  const [loading, setLoading]     = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const setCards = useCallback((next: CardWithDecks[]) => {
    setCardsState(next);
    storage.setCards(next);
  }, []);

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    // Join cards with their deck memberships
    const [{ data: cardsData }, { data: cdData }] = await Promise.all([
      supabase.from("cards").select("*").order("created_at"),
      supabase.from("card_decks").select("*"),
    ]);

    if (!cardsData) return;

    const deckMap: Record<string, string[]> = {};
    (cdData ?? []).forEach(({ card_id, deck_id }) => {
      if (!deckMap[card_id]) deckMap[card_id] = [];
      deckMap[card_id].push(deck_id);
    });

    const enriched: CardWithDecks[] = cardsData.map(c => ({
      ...c,
      deck_ids: deckMap[c.id] ?? [],
    }));

    setCards(enriched);
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

  return { cards, loading, addCard, updateCard, deleteCard, cardsForDeck, refetch: fetchAll };
}
