import { useState, useMemo } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast }      from "@/components/Toast";
import type { useCards } from "@/hooks/useCards";
import type { useDecks } from "@/hooks/useDecks";
import type { CardWithDecks } from "@/lib/supabase";
import s from "./CardList.module.css";

interface Props {
  cards: ReturnType<typeof useCards>;
  decks: ReturnType<typeof useDecks>;
  onBack: () => void;
}

export function CardList({ cards: cardsHook, decks: decksHook, onBack }: Props) {
  const toast = useToast();
  const [query,     setQuery]     = useState("");
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editES,    setEditES]    = useState("");
  const [editRU,    setEditRU]    = useState("");
  const [editDecks, setEditDecks] = useState<string[]>([]);
  const [deleteCard, setDeleteCard] = useState<CardWithDecks | null>(null);
  const [filterDeck, setFilterDeck] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return cardsHook.cards
      .filter(c => filterDeck === "all" || c.deck_ids.includes(filterDeck))
      .filter(c => !q || c.es.toLowerCase().includes(q) || c.ru.toLowerCase().includes(q));
  }, [cardsHook.cards, query, filterDeck]);

  function startEdit(card: CardWithDecks) {
    setEditId(card.id);
    setEditES(card.es);
    setEditRU(card.ru);
    setEditDecks(card.deck_ids);
  }
  function cancelEdit() { setEditId(null); }

  async function saveEdit(id: string) {
    const ok = await cardsHook.updateCard(id, { es: editES.trim(), ru: editRU.trim() }, editDecks);
    if (ok) { toast("Сохранено ✓"); setEditId(null); }
    else     { toast("Ошибка сохранения"); }
  }

  async function doDelete(card: CardWithDecks) {
    const ok = await cardsHook.deleteCard(card.id);
    if (ok) toast("Удалено");
    else    toast("Ошибка удаления");
    setDeleteCard(null);
  }

  function toggleEditDeck(id: string) {
    setEditDecks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={onBack}>←</button>
        <div>
          <div className={s.title}>Все карточки</div>
          <div className={s.subtitle}>{filtered.length} пар</div>
        </div>
      </div>

      <div className={s.body}>
        {/* ── Search ── */}
        <div className={s.searchWrap}>
          <span className={s.searchIcon}>🔍</span>
          <input className={s.search} value={query}
            onChange={e => setQuery(e.target.value)} placeholder="Поиск..." />
        </div>

        {/* ── Deck filter chips ── */}
        {decksHook.decks.length > 0 && (
          <div className={s.filterChips}>
            <button className={`${s.chip} ${filterDeck==="all" ? s.chipOn : ""}`}
              onClick={() => setFilterDeck("all")}>Все</button>
            {decksHook.decks.map(d => (
              <button key={d.id}
                className={`${s.chip} ${filterDeck===d.id ? s.chipOn : ""}`}
                style={filterDeck===d.id ? { background: d.color, borderColor: d.color, color:"#fff" } : {}}
                onClick={() => setFilterDeck(d.id)}>{d.name}</button>
            ))}
          </div>
        )}

        {/* ── List ── */}
        {filtered.length === 0 && (
          <p className={s.empty}>Ничего не найдено</p>
        )}

        {filtered.map(card => (
          <div key={card.id}>
            <div className={s.row}>
              <div className={s.words}>
                <div className={s.es}>{card.es}</div>
                <div className={s.ru}>{card.ru}</div>
                {card.deck_ids.length > 0 && (
                  <div className={s.deckTags}>
                    {card.deck_ids.map(did => {
                      const deck = decksHook.decks.find(d => d.id === did);
                      return deck ? (
                        <span key={did} className={s.tag} style={{ background: deck.color + "22", color: deck.color }}>
                          {deck.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <button className={s.editBtn} onClick={() => editId===card.id ? cancelEdit() : startEdit(card)}>✎</button>
              <button className={s.delBtn}  onClick={() => setDeleteCard(card)}>✕</button>
            </div>

            {/* ── Inline edit ── */}
            {editId === card.id && (
              <div className={s.editRow}>
                <div className={s.editFields}>
                  <input className="field" value={editES} onChange={e=>setEditES(e.target.value)} placeholder="Испанский" autoFocus />
                  <input className="field" value={editRU} onChange={e=>setEditRU(e.target.value)} placeholder="Русский" />
                </div>
                {/* Deck assignment */}
                {decksHook.decks.length > 0 && (
                  <div className={s.editChips}>
                    {decksHook.decks.map(d => (
                      <button key={d.id}
                        className={`${s.chip} ${editDecks.includes(d.id) ? s.chipOn : ""}`}
                        style={editDecks.includes(d.id) ? { background: d.color, borderColor: d.color, color:"#fff" } : {}}
                        onClick={() => toggleEditDeck(d.id)}>{d.name}</button>
                    ))}
                  </div>
                )}
                <div className={s.editActs}>
                  <button className="btn-primary" style={{borderRadius:12,padding:"10px",flex:1,margin:0}}
                    onClick={() => saveEdit(card.id)}>Сохранить</button>
                  <button className="btn-primary btn-secondary" style={{borderRadius:12,padding:"10px",flex:1,margin:0}}
                    onClick={cancelEdit}>Отмена</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteCard}
        message={`Удалить<br><strong>«${deleteCard?.es} — ${deleteCard?.ru}»</strong>?`}
        onConfirm={() => deleteCard && doDelete(deleteCard)}
        onCancel={() => setDeleteCard(null)}
      />
    </div>
  );
}
