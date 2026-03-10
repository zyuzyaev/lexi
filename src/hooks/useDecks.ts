import { useState, useEffect, useCallback } from "react";
import { supabase, type Deck } from "@/lib/supabase";
import { storage } from "@/lib/storage";

export type SyncState = "idle" | "busy" | "ok" | "err";

export function useDecks() {
  const [decks, setDecksState]   = useState<Deck[]>(() => storage.getDecks());
  const [syncState, setSyncState] = useState<SyncState>("idle");

  // persist on every change
  const setDecks = useCallback((next: Deck[]) => {
    setDecksState(next);
    storage.setDecks(next);
  }, []);

  // ── Load from Supabase on mount ──────────────────────────────────────────
  useEffect(() => {
    setSyncState("busy");
    supabase
      .from("decks")
      .select("*")
      .order("created_at")
      .then(({ data, error }) => {
        if (error) { setSyncState("err"); return; }
        if (data) { setDecks(data); setSyncState("ok"); }
      });
  }, [setDecks]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const createDeck = useCallback(async (name: string, color = "#c8a96e"): Promise<Deck | null> => {
    const { data, error } = await supabase
      .from("decks")
      .insert({ name: name.trim(), color })
      .select()
      .single();
    if (error || !data) return null;
    setDecks([...decks, data]);
    return data;
  }, [decks, setDecks]);

  const updateDeck = useCallback(async (id: string, patch: { name?: string; color?: string }) => {
    const { error } = await supabase.from("decks").update(patch).eq("id", id);
    if (error) return false;
    setDecks(decks.map(d => d.id === id ? { ...d, ...patch } : d));
    return true;
  }, [decks, setDecks]);

  const deleteDeck = useCallback(async (id: string) => {
    const { error } = await supabase.from("decks").delete().eq("id", id);
    if (error) return false;
    setDecks(decks.filter(d => d.id !== id));
    return true;
  }, [decks, setDecks]);

  return { decks, syncState, createDeck, updateDeck, deleteDeck };
}
