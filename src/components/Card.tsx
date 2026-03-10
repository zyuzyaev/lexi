import { useRef } from "react";
import type { CardWithDecks } from "@/lib/supabase";
import type { Direction } from "@/hooks/useSession";
import s from "./Card.module.css";

interface Props {
  card: CardWithDecks | null;
  flipped: boolean;
  direction: Direction;
  onFlip: () => void;
  onKnow: () => void;
  onSkip: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function Card({ card, flipped, direction, onFlip, onKnow, onSkip, onEdit, onDelete }: Props) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const didMove    = useRef(false);

  const front = card ? (direction === "es-ru" ? card.es : card.ru) : null;
  const back  = card ? (direction === "es-ru" ? card.ru : card.es) : null;
  const frontLang = direction === "es-ru" ? "ES" : "RU";
  const backLang  = direction === "es-ru" ? "RU" : "ES";

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    didMove.current = false;
  }
  function handleTouchMove() { didMove.current = true; }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dy) > Math.abs(dx) + 20) return; // vertical scroll
    if (!didMove.current || Math.abs(dx) < 40) { onFlip(); return; }
    if (dx > 60)  { onKnow(); return; }
    if (dx < -60) { onSkip(); return; }
    onFlip();
  }

  if (!card) {
    return (
      <div className={s.empty}>
        <p>Нет карточек</p>
        <span>Нажмите + чтобы добавить</span>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      <button className={`${s.fab} ${s.fabDel}`} onClick={onDelete} title="Удалить">🗑</button>

      <div
        className={`${s.scene} ${flipped ? s.flipped : ""}`}
        onClick={onFlip}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={s.inner}>
          {/* Front */}
          <div className={`${s.face} ${s.front}`}>
            <div className={s.deco} />
            <span className={s.lang}>{frontLang}</span>
            <span className={s.word}>{front}</span>
            <span className={s.hint}>нажмите чтобы перевернуть</span>
          </div>
          {/* Back */}
          <div className={`${s.face} ${s.back}`}>
            <span className={s.lang}>{backLang}</span>
            <span className={s.word}>{back}</span>
          </div>
        </div>
      </div>

      <button className={`${s.fab} ${s.fabEdit}`} onClick={onEdit} title="Редактировать (E)">✎</button>
    </div>
  );
}
