import { BottomSheet } from "./BottomSheet";
import s from "./ConfirmDialog.module.css";

interface Props {
  open: boolean;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, message, confirmLabel = "Удалить", onConfirm, onCancel }: Props) {
  return (
    <BottomSheet open={open} onClose={onCancel}>
      <div className={s.inner}>
        <p className={s.msg} dangerouslySetInnerHTML={{ __html: message }} />
        <div className={s.btns}>
          <button className={`btn-primary btn-danger ${s.btn}`} onClick={onConfirm}>{confirmLabel}</button>
          <button className={`btn-primary btn-secondary ${s.btn}`} onClick={onCancel}>Отмена</button>
        </div>
      </div>
    </BottomSheet>
  );
}
