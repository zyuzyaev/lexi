import { useState, useCallback, useMemo } from "react";
import { storage } from "@/lib/storage";
import type { CardWithDecks } from "@/lib/supabase";

export type Direction = "es-ru" | "ru-es";

// Weight per card stored by card id (higher = harder, shown more often)
function weightedPick(ids: string[], weights: Record<string, number>, exclude: string): string {
  const pool: string[] = [];
  ids.forEach(id => {
    if (id === exclude) return;
    const w = weights[id] ?? 1;
    for (let i = 0; i < w; i++) pool.push(id);
  });
  if (!pool.length) return ids[0] ?? exclude;
  return pool[Math.floor(Math.random() * pool.length)];
}

function haptic(pattern: number | number[] = 8) {
  try { navigator.vibrate?.(pattern); } catch {}
}

export function useSession(deck: CardWithDecks[]) {
  const [currentId, setCurrentId] = useState<string | null>(() => deck[0]?.id ?? null);
  const [flipped,   setFlipped]   = useState(false);
  const [direction, setDirection] = useState<Direction>("es-ru");
  const [score,     setScoreState] = useState(() => storage.getScore());
  const [weights,   setWeightsState] = useState<Record<string, number>>(() => storage.getWeights());

  const ids = useMemo(() => deck.map(c => c.id), [deck]);

  const currentCard = useMemo(
    () => deck.find(c => c.id === currentId) ?? deck[0] ?? null,
    [deck, currentId],
  );

  // ── Persist ───────────────────────────────────────────────────────────────

  const setScore = useCallback((s: { know: number; skip: number }) => {
    setScoreState(s);
    storage.setScore(s);
  }, []);

  const setWeights = useCallback((w: Record<string, number>) => {
    setWeightsState(w);
    storage.setWeights(w);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const flip = useCallback(() => {
    if (!currentCard) return;
    setFlipped(f => !f);
  }, [currentCard]);

  const next = useCallback((newId?: string) => {
    if (!ids.length) return;
    const nextId = newId ?? weightedPick(ids, weights, currentId ?? "");
    setCurrentId(nextId);
    setFlipped(false);
  }, [ids, weights, currentId]);

  // Called when deck changes externally (new deck selected) — jump to first card
  const resetDeck = useCallback(() => {
    const first = ids[0];
    if (first) { setCurrentId(first); setFlipped(false); }
  }, [ids]);

  const markKnow = useCallback(() => {
    if (!currentId) return;
    haptic(6);
    const newW = { ...weights, [currentId]: Math.max(1, (weights[currentId] ?? 1) - 1) };
    setWeights(newW);
    setScore({ ...score, know: score.know + 1 });
    next();
  }, [currentId, weights, score, setWeights, setScore, next]);

  const markSkip = useCallback(() => {
    if (!currentId) return;
    haptic([8, 50, 8]);
    const newW = { ...weights, [currentId]: Math.min(6, (weights[currentId] ?? 1) + 2) };
    setWeights(newW);
    setScore({ ...score, skip: score.skip + 1 });
    next();
  }, [currentId, weights, score, setWeights, setScore, next]);

  const toggleDirection = useCallback(() => {
    setDirection(d => d === "es-ru" ? "ru-es" : "es-ru");
    setFlipped(false);
  }, []);

  const resetScore = useCallback(() => {
    const reset = { know: 0, skip: 0 };
    setScore(reset);
    // Keep weights — they represent card difficulty, not session
  }, [setScore]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const accuracy = (score.know + score.skip)
    ? Math.round((score.know / (score.know + score.skip)) * 100)
    : null;

  const hardCards = useMemo(
    () => deck.filter(c => (weights[c.id] ?? 1) >= 4),
    [deck, weights],
  );

  const cardIndex = ids.indexOf(currentId ?? "");

  return {
    currentCard,
    cardIndex,
    flipped,
    direction,
    score,
    weights,
    accuracy,
    hardCards,
    flip,
    next,
    markKnow,
    markSkip,
    toggleDirection,
    resetScore,
    resetDeck,
  };
}
