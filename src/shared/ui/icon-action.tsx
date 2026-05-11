import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "./button";

type IconActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  active?: boolean;
  asChild?: boolean;
};

export function IconAction({ label, children, active, asChild, className = "", ...props }: IconActionProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <Button
            aria-label={label}
            asChild={asChild}
            className={`floating-tab ${active ? "floating-tab-active" : ""} ${className}`}
            size="icon"
            type="button"
            variant="ghost"
            {...props}
          >
            {children}
          </Button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={cn(
              "z-50 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md",
            )}
            sideOffset={6}
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-popover" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
