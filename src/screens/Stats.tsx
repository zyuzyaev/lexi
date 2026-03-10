import type { useSession } from "@/hooks/useSession";
import type { useCards }   from "@/hooks/useCards";
import type { useDecks }   from "@/hooks/useDecks";
import s from "./Stats.module.css";

interface Props {
  session: ReturnType<typeof useSession>;
  cards:   ReturnType<typeof useCards>;
  decks:   ReturnType<typeof useDecks>;
  activeDeckId: string;
  onBack: () => void;
}

export function Stats({ session, cards: cardsHook, decks: decksHook, activeDeckId, onBack }: Props) {
  const { score, accuracy, hardCards, weights } = session;
  const activeDeck = decksHook.decks.find(d => d.id === activeDeckId);
  const deckCards  = cardsHook.cardsForDeck(activeDeckId);

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={onBack}>←</button>
        <div className={s.title}>Статистика</div>
      </div>

      <div className={s.body}>
        {/* ── Active deck ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>Текущая папка</div>
          <div className={s.deckCard} style={{ borderColor: activeDeck?.color ?? "var(--border)" }}>
            <span className={s.deckName}>{activeDeck?.name ?? "Все папки"}</span>
            <span className={s.deckCount}>{deckCards.length} карточек</span>
          </div>
        </div>

        {/* ── Session stats ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>Сессия</div>
          <div className={s.grid}>
            <div className={`${s.statCard} ${s.accent}`}>
              <div className={s.statVal}>{accuracy !== null ? `${accuracy}%` : "—"}</div>
              <div className={s.statLbl}>Точность</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statVal}>{cardsHook.cards.length}</div>
              <div className={s.statLbl}>Всего карточек</div>
            </div>
            <div className={s.statCard}>
              <div className={`${s.statVal} ${s.green}`}>{score.know}</div>
              <div className={s.statLbl}>Знаю</div>
            </div>
            <div className={s.statCard}>
              <div className={`${s.statVal} ${s.red}`}>{score.skip}</div>
              <div className={s.statLbl}>Не знаю</div>
            </div>
          </div>
        </div>

        {/* ── Decks overview ── */}
        {decksHook.decks.length > 0 && (
          <div className={s.section}>
            <div className={s.sectionTitle}>Папки</div>
            {decksHook.decks.map(deck => {
              const count = cardsHook.cardsForDeck(deck.id).length;
              const pct   = cardsHook.cards.length ? Math.round(count / cardsHook.cards.length * 100) : 0;
              return (
                <div key={deck.id} className={s.deckRow}>
                  <span className={s.deckDot} style={{ background: deck.color }} />
                  <span className={s.deckRowName}>{deck.name}</span>
                  <span className={s.deckRowCount}>{count}</span>
                  <div className={s.miniBar}>
                    <div className={s.miniFill} style={{ width: `${pct}%`, background: deck.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Hard cards ── */}
        <div className={s.section}>
          <div className={s.sectionTitle}>Сложные карточки {hardCards.length > 0 && `(${hardCards.length})`}</div>
          {hardCards.length === 0
            ? <p className={s.empty}>Сложных карточек нет 🎉</p>
            : hardCards.map(c => (
                <div key={c.id} className={s.hardRow}>
                  <span>{c.es} — {c.ru}</span>
                  <span className={s.hardBadge}>×{weights[c.id] ?? 1}</span>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}
