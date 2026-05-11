import type { ReactNode } from "react";
import { Badge } from "./badge";

export function StatusBadge({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <Badge className={`status-badge status-${tone}`} variant="outline">
      {children}
    </Badge>
  );
}
