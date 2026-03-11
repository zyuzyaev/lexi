import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, type CardWithDecks } from "@/lib/supabase";
import { storage } from "@/lib/storage";

export function useCards() {

  const [cards, setCardsState] = useState<CardWithDecks[]>(() => storage.getCards());
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);

  const channelRef = useRef<any>(null);

  const setCards = useCallback((next: CardWithDecks[]) => {
    setCardsState(next);
    storage.setCards(next);
  }, []);

  // ─────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────

  const fetchCards = useCallback(async () => {

    const [{ data: cardsData, error: cardsErr }, { data: decksData }] = await Promise.all([
      supabase.from("cards").select("*").order("created_at"),
      supabase.from("card_decks").select("*")
    ]);

    if (cardsErr || !cardsData) {
      setSyncError(true);
      return;
    }

    setSyncError(false);

    const deckMap: Record<string, string[]> = {};

    (decksData ?? []).forEach(({ card_id, deck_id }) => {
      if (!deckMap[card_id]) deckMap[card_id] = [];
      deckMap[card_id].push(deck_id);
    });

    const merged: CardWithDecks[] = cardsData.map(card => ({
      ...card,
      deck_ids: deckMap[card.id] ?? []
    }));

    setCards(merged);

  }, [setCards]);

  // ─────────────────────────────────────────
  // INITIAL LOAD
  // ─────────────────────────────────────────

  useEffect(() => {

    fetchCards().finally(() => setLoading(false));

    channelRef.current = supabase
      .channel("cards-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        fetchCards
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "card_decks" },
        fetchCards
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };

  }, [fetchCards]);

  // ─────────────────────────────────────────
  // ADD
  // ─────────────────────────────────────────

  const addCard = useCallback(async (
    es: string,
    ru: string,
    deckIds: string[] = []
  ): Promise<CardWithDecks | null> => {

    es = es.trim();
    ru = ru.trim();

    const tempId = crypto.randomUUID();

    const optimistic: CardWithDecks = {
      id: tempId,
      es,
      ru,
      deck_ids: deckIds
    } as CardWithDecks;

    setCards([optimistic, ...cards]);

    const { data, error } = await supabase
      .from("cards")
      .insert({ es, ru })
      .select()
      .single();

    if (error || !data) {
      fetchCards();
      return null;
    }

    if (deckIds.length) {
      await supabase
        .from("card_decks")
        .insert(deckIds.map(deck_id => ({
          card_id: data.id,
          deck_id
        })));
    }

    fetchCards();

    return {
      ...data,
      deck_ids: deckIds
    };

  }, [cards, setCards, fetchCards]);

  // ─────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────

  const updateCard = useCallback(async (
    id: string,
    patch: { es?: string; ru?: string },
    deckIds?: string[]
  ): Promise<boolean> => {

    setCards(cards.map(c =>
      c.id === id ? { ...c, ...patch } : c
    ));

    if (patch.es || patch.ru) {
      const { error } = await supabase
        .from("cards")
        .update(patch)
        .eq("id", id);

      if (error) {
        fetchCards();
        return false;
      }
    }

    if (deckIds !== undefined) {

      await supabase
        .from("card_decks")
        .delete()
        .eq("card_id", id);

      if (deckIds.length) {
        await supabase
          .from("card_decks")
          .insert(deckIds.map(deck_id => ({
            card_id: id,
            deck_id
          })));
      }
    }

    fetchCards();
    return true;

  }, [cards, setCards, fetchCards]);

  // ─────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────

  const deleteCard = useCallback(async (id: string): Promise<boolean> => {

    setCards(cards.filter(c => c.id !== id));

    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("id", id);

    if (error) {
      fetchCards();
      return false;
    }

    return true;

  }, [cards, setCards, fetchCards]);

  // ─────────────────────────────────────────
  // FILTER
  // ─────────────────────────────────────────

  const cardsForDeck = useCallback((deckId: "all" | string) => {

    if (deckId === "all") return cards;

    return cards.filter(c =>
      c.deck_ids.includes(deckId)
    );

  }, [cards]);

  return {
    cards,
    loading,
    syncError,
    addCard,
    updateCard,
    deleteCard,
    cardsForDeck,
    refetch: fetchCards
  };

}