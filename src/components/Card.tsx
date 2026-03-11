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
  const ignoreClick = useRef(false);
  const dragX = useRef(0);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const front = card ? (direction === "es-ru" ? card.es : card.ru) : null;
  const back  = card ? (direction === "es-ru" ? card.ru : card.es) : null;
  const frontLang = direction === "es-ru" ? "ES" : "RU";
  const backLang  = direction === "es-ru" ? "RU" : "ES";

function handleTouchStart(e: React.TouchEvent) {
  const t = e.touches[0];
  touchStart.current = { x: t.clientX, y: t.clientY };
  didMove.current = false;
}

function handleTouchMove(e: React.TouchEvent) {
  if (!touchStart.current || !cardRef.current) return;

  const dx = e.touches[0].clientX - touchStart.current.x;
  const dy = e.touches[0].clientY - touchStart.current.y;

    if (Math.abs(dy) > Math.abs(dx) + 20) {
      if (cardRef.current) {
        cardRef.current.style.transform = "";
        cardRef.current.style.background = "";
      }
      return;
    }

  dragX.current = dx;

  const el = cardRef.current;

  el.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;

  if (dx > 40) {
    el.style.background = "rgba(60,200,120,0.15)";
  } else if (dx < -40) {
    el.style.background = "rgba(255,80,80,0.15)";
  } else {
    el.style.background = "";
  }
}

function handleTouchEnd(e: React.TouchEvent) {
  if (!touchStart.current) return;

  const dx = e.changedTouches[0].clientX - touchStart.current.x;
  const dy = e.changedTouches[0].clientY - touchStart.current.y;
  touchStart.current = null;

  ignoreClick.current = true;
  setTimeout(() => (ignoreClick.current = false), 250);

  if (Math.abs(dy) > Math.abs(dx) + 20) return;

  if (!didMove.current || Math.abs(dx) < 40) {
    onFlip();
    return;
  }

    if (dx > 80) {
      onKnow();
      return;
    }

    navigator.vibrate?.(10);

    if (dx < -80) {
      onSkip();
      return;
    }

    onFlip();
}
if (dx > 80) {
  onKnow();
} else if (dx < -80) {
  onSkip();
} else {
  onFlip();
}

if (cardRef.current) {
  cardRef.current.style.transform = "";
  cardRef.current.style.background = "";
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
          ref={cardRef}
          className={`${s.scene} ${flipped ? s.flipped : ""}`}
        onClick={() => {
          if (ignoreClick.current) return;
          onFlip();
        }}
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
