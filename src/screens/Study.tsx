import { useState, useEffect, useCallback } from "react";
import { Card }           from "@/components/Card";
import { BottomSheet }    from "@/components/BottomSheet";
import { ConfirmDialog }  from "@/components/ConfirmDialog";
import { useToast }       from "@/components/Toast";
import type { useCards }  from "@/hooks/useCards";
import type { useDecks }  from "@/hooks/useDecks";
import type { useSession } from "@/hooks/useSession";
import type { CardWithDecks, Deck } from "@/lib/supabase";
import s from "./Study.module.css";

// ── Shared row component for bottom sheets ──────────────────────────────────
function SheetRow({
  icon, label, desc, chevron = false, onClick,
}: { icon: string; label: string; desc?: string; chevron?: boolean; onClick?: () => void }) {
  return (
    <button className={s.srow} onClick={onClick}>
      <span className={s.srowIcon}>{icon}</span>
      <span className={s.srowText}>
        <span>{label}</span>
        {desc && <span className={s.srowDesc}>{desc}</span>}
      </span>
      {chevron && <span className={s.srowChev}>›</span>}
    </button>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
type CardsHook   = ReturnType<typeof useCards>;
type DecksHook   = ReturnType<typeof useDecks>;
type SessionHook = ReturnType<typeof useSession>;

interface Props {
  cards:   CardsHook;
  decks:   DecksHook;
  session: SessionHook;
  activeDeckId: string;
  setActiveDeckId: (id: string) => void;
  onOpenList:  () => void;
  onOpenStats: () => void;
}

// ── DECK COLORS ──────────────────────────────────────────────────────────────
const COLORS = ["#c8a96e","#7eb8a4","#a07ec8","#e07060","#6090c8","#c8a07e","#60a860"];

// ── Component ────────────────────────────────────────────────────────────────
export function Study({
  cards: cardsHook,
  decks: decksHook,
  session,
  activeDeckId,
  setActiveDeckId,
  onOpenList,
  onOpenStats,
}: Props) {
  const toast = useToast();

  // ── Local UI state ────────────────────────────────────────────────────────
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [addOpen,     setAddOpen]     = useState(false);
  const [addMethod,   setAddMethod]   = useState<"manual"|"translate"|"ocr"|null>(null);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [editOpen,    setEditOpen]    = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);

  // add-card form
  const [manES, setManES] = useState("");
  const [manRU, setManRU] = useState("");
  const [trWord, setTrWord]   = useState("");
  const [trResult, setTrResult] = useState<{es:string,ru:string}|null>(null);
  const [trLoading, setTrLoading] = useState(false);

  // edit form
  const [editES, setEditES] = useState("");
  const [editRU, setEditRU] = useState("");

  // new deck form
  const [newDeckName,  setNewDeckName]  = useState("");
  const [newDeckColor, setNewDeckColor] = useState(COLORS[0]);

  // selected decks for a new card
  const [cardDeckIds, setCardDeckIds] = useState<string[]>([]);

  const activeDeck: Deck | undefined = decksHook.decks.find(d => d.id === activeDeckId);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "ArrowLeft") { e.preventDefault(); session.flip(); }
      if (e.key === "ArrowRight") session.next();
      if (e.key === "ArrowUp")    session.markKnow();
      if (e.key === "ArrowDown")  session.markSkip();
      if (e.key === "e" || e.key === "E") openEdit();
      if (e.key === "Escape") { setMenuOpen(false); setAddOpen(false); setEditOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ── Edit ──────────────────────────────────────────────────────────────────
  function openEdit() {
    if (!session.currentCard) return;
    setEditES(session.currentCard.es);
    setEditRU(session.currentCard.ru);
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!session.currentCard) return;
    const ok = await cardsHook.updateCard(session.currentCard.id, { es: editES.trim(), ru: editRU.trim() });
    if (ok) { toast("Сохранено ✓"); setEditOpen(false); }
    else     { toast("Ошибка сохранения"); }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function confirmDeleteCard() {
    if (!session.currentCard) return;
    const ok = await cardsHook.deleteCard(session.currentCard.id);
    if (ok) { toast("Карточка удалена"); session.next(); }
    setDeleteOpen(false);
  }

  // ── Add card ─────────────────────────────────────────────────────────────
  async function saveManual() {
    if (!manES.trim() || !manRU.trim()) { toast("Оба поля обязательны"); return; }
    const card = await cardsHook.addCard(manES, manRU, cardDeckIds);
    if (card) {
      toast("Карточка добавлена ✓");
      setManES(""); setManRU(""); setCardDeckIds([]);
      setAddOpen(false);
    } else {
      toast("Ошибка или дубликат");
    }
  }

  async function findTranslation() {
    if (!trWord.trim()) return;
    setTrLoading(true); setTrResult(null);
    try {
      const res  = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(trWord)}&langpair=es|ru`);
      const data = await res.json() as { responseData: { translatedText: string } };
      const ru   = data?.responseData?.translatedText;
      if (ru) setTrResult({ es: trWord, ru });
      else     toast("Перевод не найден");
    } catch { toast("Ошибка перевода"); }
    finally { setTrLoading(false); }
  }

  async function saveTranslation() {
    if (!trResult) return;
    const card = await cardsHook.addCard(trResult.es, trResult.ru, cardDeckIds);
    if (card) {
      toast("Добавлено ✓"); setTrWord(""); setTrResult(null); setCardDeckIds([]); setAddOpen(false);
    } else { toast("Ошибка или дубликат"); }
  }

  // ── New deck ──────────────────────────────────────────────────────────────
  async function createDeck() {
    if (!newDeckName.trim()) { toast("Введите название"); return; }
    const deck = await decksHook.createDeck(newDeckName.trim(), newDeckColor);
    if (deck) {
      toast(`Папка «${deck.name}» создана`);
      setNewDeckName(""); setNewDeckOpen(false);
    }
  }

  // ── Toggle deck filter ────────────────────────────────────────────────────
  function toggleCardDeck(id: string) {
    setCardDeckIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // sync dot
  const dotClass = {
    idle: s.dotIdle, busy: s.dotBusy, ok: s.dotOk, err: s.dotErr,
  }[decksHook.syncState];

  const deckLabel = activeDeck ? activeDeck.name : "Все папки";
  const deckCount = cardsHook.cardsForDeck(activeDeckId).length;

  return (
    <div className={s.screen}>

      {/* ── HEADER ───────────────────────────────────────── */}
      <header className={s.header}>
        <span className={s.logo}>Lexi</span>
        <div className={s.hdrRight}>
          <span className={`${s.dot} ${dotClass}`} />
          <button className={s.deckBtn} onClick={() => setDeckPickerOpen(true)}>
            {activeDeck && <span className={s.deckDot} style={{ background: activeDeck.color }} />}
            {deckLabel}
          </button>
          <button className={s.iconBtn} onClick={() => setMenuOpen(true)}>⋯</button>
        </div>
      </header>

      {/* ── CARD ─────────────────────────────────────────── */}
      <Card
        card={session.currentCard}
        flipped={session.flipped}
        direction={session.direction}
        onFlip={session.flip}
        onKnow={session.markKnow}
        onSkip={session.markSkip}
        onEdit={openEdit}
        onDelete={() => setDeleteOpen(true)}
      />

      {/* ── INLINE EDIT ──────────────────────────────────── */}
      {editOpen && (
        <div className={s.editInline}>
          <div className={s.editLabel}>Редактировать</div>
          <div className={s.editRow}>
            <input className="field" value={editES} onChange={e=>setEditES(e.target.value)} placeholder="Испанский" autoFocus />
            <input className="field" value={editRU} onChange={e=>setEditRU(e.target.value)} placeholder="Русский" />
          </div>
          <div className={s.editActs}>
            <button className="btn-primary" onClick={saveEdit}>Сохранить</button>
            <button className="btn-primary btn-secondary" onClick={()=>setEditOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      {/* ── PROGRESS ─────────────────────────────────────── */}
      <div className={s.progRow}>
        <span className={s.progTxt}>{deckCount > 0 ? `${(session.cardIndex ?? 0) + 1} / ${deckCount}` : "0 / 0"}</span>
        <div className={s.progBar}>
          <div className={s.progFill} style={{
            width: (session.score.know + session.score.skip + deckCount)
              ? `${Math.round((session.score.know + session.score.skip) / (session.score.know + session.score.skip + deckCount) * 100)}%`
              : "0%"
          }} />
        </div>
        <div className={s.scoreRow}>
          <span className={s.sc}><span className={`${s.scDot} ${s.scGreen}`}/>{session.score.know}</span>
          <span className={s.sc}><span className={`${s.scDot} ${s.scRed}`}/>{session.score.skip}</span>
        </div>
      </div>

      {/* ── MAIN BUTTONS ─────────────────────────────────── */}
      <div className={s.mainBtns}>
        <button className={`${s.mbtn} ${s.mbtnSkip}`} onClick={session.markSkip}>✕ Не знаю</button>
        <button className={`${s.mbtn} ${s.mbtnKnow}`} onClick={session.markKnow}>✓ Знаю</button>
      </div>

      {/* ── DIRECTION ────────────────────────────────────── */}
      <button className={s.dirBtn} onClick={session.toggleDirection}>
        {session.direction === "es-ru" ? "ES → RU" : "RU → ES"}
      </button>

      {/* ── KB HINTS ─────────────────────────────────────── */}
      <div className={s.kbHints}>
        <span className={s.kb}><kbd>Пробел</kbd> перевернуть</span>
        <span className={s.kb}><kbd>→</kbd> след.</span>
        <span className={s.kb}><kbd>↑</kbd> знаю</span>
        <span className={s.kb}><kbd>↓</kbd> не знаю</span>
        <span className={s.kb}><kbd>E</kbd> ред.</span>
      </div>

      {/* ── FAB ──────────────────────────────────────────── */}
      <button className={s.fab} onClick={() => { setAddMethod(null); setAddOpen(true); }}>＋</button>

      {/* ════ DECK PICKER SHEET ══════════════════════════ */}
      <BottomSheet open={deckPickerOpen} onClose={() => setDeckPickerOpen(false)} title="Выбор папки">
        <SheetRow icon="📚" label="Все папки" desc={`${cardsHook.cards.length} карточек`}
          onClick={() => { setActiveDeckId("all"); session.resetDeck(); setDeckPickerOpen(false); }} />
        <div className={s.sheetDivider}/>
        {decksHook.decks.map(deck => (
          <SheetRow key={deck.id} icon="📁" label={deck.name}
            desc={`${cardsHook.cardsForDeck(deck.id).length} карточек`}
            onClick={() => { setActiveDeckId(deck.id); session.resetDeck(); setDeckPickerOpen(false); }}
          />
        ))}
        <div className={s.sheetDivider}/>
        <SheetRow icon="＋" label="Новая папка" onClick={() => { setDeckPickerOpen(false); setNewDeckOpen(true); }} />
      </BottomSheet>

      {/* ════ NEW DECK SHEET ═════════════════════════════ */}
      <BottomSheet open={newDeckOpen} onClose={() => setNewDeckOpen(false)} title="Новая папка">
        <div className={s.sheetForm}>
          <input className="field" value={newDeckName} onChange={e=>setNewDeckName(e.target.value)}
            placeholder="Название папки" autoFocus onKeyDown={e=>{ if(e.key==="Enter") createDeck(); }}/>
          <div className={s.colorRow}>
            {COLORS.map(c => (
              <button key={c} className={`${s.colorDot} ${newDeckColor===c ? s.colorActive : ""}`}
                style={{ background: c }} onClick={() => setNewDeckColor(c)} />
            ))}
          </div>
          <button className="btn-primary" onClick={createDeck}>Создать</button>
        </div>
      </BottomSheet>

      {/* ════ ADD CARD SHEET ═════════════════════════════ */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Добавить карточку">

        {/* Deck assignment */}
        {decksHook.decks.length > 0 && (
          <div className={s.deckChips}>
            {decksHook.decks.map(d => (
              <button key={d.id}
                className={`${s.chip} ${cardDeckIds.includes(d.id) ? s.chipOn : ""}`}
                style={cardDeckIds.includes(d.id) ? { background: d.color, borderColor: d.color, color:"#fff" } : {}}
                onClick={() => toggleCardDeck(d.id)}>
                {d.name}
              </button>
            ))}
          </div>
        )}

        {/* Method selector */}
        {!addMethod && <>
          <SheetRow icon="✏️" label="Вручную"        chevron onClick={() => setAddMethod("manual")} />
          <SheetRow icon="🔍" label="Найти перевод"  chevron onClick={() => setAddMethod("translate")} />
        </>}

        {/* Manual form */}
        {addMethod === "manual" && (
          <div className={s.sheetForm}>
            <input className="field" value={manES} onChange={e=>setManES(e.target.value)} placeholder="Испанский" autoFocus />
            <input className="field" value={manRU} onChange={e=>setManRU(e.target.value)} placeholder="Русский"
              onKeyDown={e=>{ if(e.key==="Enter") saveManual(); }} />
            <div className={s.editActs}>
              <button className="btn-primary" onClick={saveManual}>Сохранить</button>
              <button className="btn-primary btn-secondary" onClick={()=>setAddMethod(null)}>←</button>
            </div>
          </div>
        )}

        {/* Translate form */}
        {addMethod === "translate" && (
          <div className={s.sheetForm}>
            <div className={s.editRow}>
              <input className="field" value={trWord} onChange={e=>setTrWord(e.target.value)}
                placeholder="Испанское слово..." autoFocus
                onKeyDown={e=>{ if(e.key==="Enter") findTranslation(); }} />
              <button className={`btn-primary ${s.trBtn}`} onClick={findTranslation} disabled={trLoading}>
                {trLoading ? "..." : "→"}
              </button>
            </div>
            {trResult && (
              <div className={s.trPreview}>
                <input className="field" value={trResult.es} onChange={e=>setTrResult({...trResult,es:e.target.value})} />
                <input className="field" value={trResult.ru} onChange={e=>setTrResult({...trResult,ru:e.target.value})} />
                <button className="btn-primary" onClick={saveTranslation}>Сохранить</button>
              </div>
            )}
            <button className="btn-primary btn-secondary" style={{marginTop:4}} onClick={()=>setAddMethod(null)}>←</button>
          </div>
        )}
      </BottomSheet>

      {/* ════ MENU SHEET ════════════════════════════════ */}
      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Lexi">
        <SheetRow icon="📋" label="Все карточки" desc={`${cardsHook.cards.length} пар`}
          chevron onClick={() => { setMenuOpen(false); onOpenList(); }} />
        <SheetRow icon="📊" label="Статистика" desc="Прогресс сессии"
          chevron onClick={() => { setMenuOpen(false); onOpenStats(); }} />
        <div className={s.sheetDivider}/>
        <SheetRow icon="↺" label="Сбросить прогресс" onClick={() => { session.resetScore(); setMenuOpen(false); toast("Прогресс сброшен"); }} />
        <SheetRow icon={decksHook.syncState === "busy" ? "⟳" : "☁"} label="Синхронизировать"
          onClick={() => { setMenuOpen(false); }} />
      </BottomSheet>

      {/* ════ CONFIRM DELETE ════════════════════════════ */}
      <ConfirmDialog
        open={deleteOpen}
        message={`Удалить карточку<br><strong>«${session.currentCard?.es} — ${session.currentCard?.ru}»</strong>?`}
        onConfirm={confirmDeleteCard}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
