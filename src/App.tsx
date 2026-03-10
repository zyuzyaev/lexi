import { useState, useEffect } from "react";
import { Study }    from "@/screens/Study";
import { CardList } from "@/screens/CardList";
import { Stats }    from "@/screens/Stats";
import { useCards } from "@/hooks/useCards";
import { useDecks } from "@/hooks/useDecks";
import { useSession } from "@/hooks/useSession";
import { storage }  from "@/lib/storage";

type Screen = "study" | "list" | "stats";

export function App() {
  const [screen,       setScreen]       = useState<Screen>("study");
  const [activeDeckId, setActiveDeckId] = useState<string>(() => storage.getActiveDeck());
  const [theme,        setTheme]        = useState<"light"|"dark">(() => storage.getTheme());

  const cardsHook = useCards();
  const decksHook = useDecks();

  // Filtered cards for the current deck
  const deckCards = cardsHook.cardsForDeck(activeDeckId);
  const session   = useSession(deckCards);

  // Reset study session when deck changes
  useEffect(() => {
    storage.setActiveDeck(activeDeckId);
    session.resetDeck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeckId]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    storage.setTheme(theme);
    const meta = document.getElementById("themeColor") as HTMLMetaElement | null;
    if (meta) meta.content = theme === "dark" ? "#111110" : "#f0ede8";
  }, [theme]);

  // Toggle theme (exposed to menu via prop drilling — simple enough here)
  function toggleTheme() { setTheme(t => t === "light" ? "dark" : "light"); }

  return (
    <>
      {screen === "study" && (
        <Study
          cards={cardsHook}
          decks={decksHook}
          session={session}
          activeDeckId={activeDeckId}
          setActiveDeckId={setActiveDeckId}
          onOpenList={()  => setScreen("list")}
          onOpenStats={() => setScreen("stats")}
        />
      )}
      {screen === "list" && (
        <CardList
          cards={cardsHook}
          decks={decksHook}
          onBack={() => setScreen("study")}
        />
      )}
      {screen === "stats" && (
        <Stats
          session={session}
          cards={cardsHook}
          decks={decksHook}
          activeDeckId={activeDeckId}
          onBack={() => setScreen("study")}
        />
      )}

      {/* theme toggle — rendered on top of every screen */}
      <button
        onClick={toggleTheme}
        style={{
          position: "fixed", top: 14, right: screen === "study" ? 68 : 68,
          width: 36, height: 36, borderRadius: "50%",
          border: "1px solid var(--border)", background: "transparent",
          color: "var(--ink)", fontSize: 15,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 50,
          // hide on study screen (it has its own header)
          opacity: screen === "study" ? 0 : 1,
          pointerEvents: screen === "study" ? "none" : "auto",
        }}
      >
        {theme === "dark" ? "☀︎" : "☾"}
      </button>
    </>
  );
}
