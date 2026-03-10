import { useState, useCallback, useRef, createContext, useContext, type ReactNode } from "react";
import s from "./Toast.module.css";

// ── Context ───────────────────────────────────────────────────────────────────

type ToastFn = (msg: string) => void;
const ToastCtx = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastCtx);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg,     setMsg]     = useState("");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((text: string) => {
    setMsg(text);
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={`${s.toast} ${visible ? s.show : ""}`}>{msg}</div>
    </ToastCtx.Provider>
  );
}
