import { useState, useCallback, useMemo, useEffect } from "react";
import { storage } from "@/lib/storage";
import type { CardWithDecks } from "@/lib/supabase";

export type Direction = "es-ru" | "ru-es";

function haptic(pattern: number | number[] = 8) {
  try { navigator.vibrate?.(pattern); } catch {}
}

function schedule(card: any, result: "know" | "skip") {

  const now = Date.now();

  if (!card.stage) card.stage = 0;
  if (!card.know_total) card.know_total = 0;

  if (result === "skip") {

    card.stage = 0;
    card.next_review = now + 30_000;

    return;
  }

  card.know_total++;

  // карточка выучена
  if (card.know_total >= 10) {

    card.next_review = Infinity;
    return;
  }

  const steps = [
    60_000,          // 1 min
    10 * 60_000,     // 10 min
    60 * 60_000,     // 1h
    24 * 60 * 60_000 // 1 day
  ];

  const step = steps[card.stage] ?? steps[steps.length - 1];

  card.stage++;
  card.next_review = now + step;

}

export function useSession(deck: CardWithDecks[]) {

  const [queue, setQueue] = useState<CardWithDecks[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<Direction>("es-ru");
  const [score, setScoreState] = useState(() => storage.getScore());

  // ─────────────────────────────────────────
  // BUILD QUEUE
  // ─────────────────────────────────────────

  useEffect(() => {

    const now = Date.now();

    const ready = deck
      .filter(c => {

        if ((c as any).know_total >= 10) return false;

        if (!(c as any).next_review) return true;

        return (c as any).next_review <= now;

      })
      .sort(() => Math.random() - 0.5);

    setQueue(ready);

  }, [deck]);

  const currentCard = queue[0] ?? null;

  // ─────────────────────────────────────────
  // SCORE
  // ─────────────────────────────────────────

  const setScore = useCallback((s: { know: number; skip: number }) => {
    setScoreState(s);
    storage.setScore(s);
  }, []);

  // ─────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────

  const flip = useCallback(() => {

    if (!currentCard) return;

    setFlipped(f => !f);

  }, [currentCard]);

  const next = useCallback(() => {

    setQueue(q => q.slice(1));
    setFlipped(false);

  }, []);

  const markKnow = useCallback(() => {

    if (!currentCard) return;

    haptic(6);

    schedule(currentCard, "know");

    setScore({
      ...score,
      know: score.know + 1
    });

    next();

  }, [currentCard, score, setScore, next]);

  const markSkip = useCallback(() => {

    if (!currentCard) return;

    haptic([8, 50, 8]);

    schedule(currentCard, "skip");

    setScore({
      ...score,
      skip: score.skip + 1
    });

    // возвращаем карточку в конец очереди
    setQueue(q => [...q.slice(1), currentCard]);

    setFlipped(false);

  }, [currentCard, score, setScore]);

  const toggleDirection = useCallback(() => {

    setDirection(d => d === "es-ru" ? "ru-es" : "es-ru");
    setFlipped(false);

  }, []);

  const resetScore = useCallback(() => {

    const reset = { know: 0, skip: 0 };

    setScore(reset);

  }, [setScore]);

  // ─────────────────────────────────────────
  // DERIVED
  // ─────────────────────────────────────────

  const accuracy = (score.know + score.skip)
    ? Math.round((score.know / (score.know + score.skip)) * 100)
    : null;

  const progress = deck.length
    ? Math.round((score.know / deck.length) * 100)
    : 0;

  return {

    currentCard,
    flipped,
    direction,
    score,
    accuracy,
    progress,
    remaining: queue.length,

    flip,
    next,
    markKnow,
    markSkip,
    toggleDirection,
    resetScore

  };

}