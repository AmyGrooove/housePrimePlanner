import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

type DialogContentProps = {
  title: string;
  children: ReactNode;
  contentClassName: string;
  overlayClassName?: string;
  onOpenChange?: (open: boolean) => void;
};

export function DialogContent({
  title,
  children,
  contentClassName,
  overlayClassName = "dialog-backdrop",
  onOpenChange,
}: DialogContentProps) {
  return (
    <DialogPrimitive.Root open onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayClassName} />
        <DialogPrimitive.Content aria-describedby={undefined} className={contentClassName}>
          <DialogPrimitive.Title asChild>
            <span className="dialog-a11y-title">{title}</span>
          </DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
