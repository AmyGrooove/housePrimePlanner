import type { ReactNode } from "react";
import { Button } from "./button";
import { DialogContent } from "./dialog";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Отмена",
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <DialogContent
      contentClassName="confirm-dialog"
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
      overlayClassName="dialog-backdrop confirm-backdrop"
      title={title}
    >
      <div>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
        {children}
      </div>
      <div className="form-actions">
        <Button onClick={onConfirm} type="button">
          {confirmLabel}
        </Button>
        <Button onClick={onCancel} type="button" variant="outline">
          {cancelLabel}
        </Button>
      </div>
    </DialogContent>
  );
}
