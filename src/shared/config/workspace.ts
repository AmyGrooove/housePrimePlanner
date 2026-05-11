import { Box, Grid2X2, Home, Settings } from "lucide-react";

export type WorkspacePanel = "objects" | "rooms" | "roomDetails" | "settings";
export type WorkspaceTool = WorkspacePanel | "cursor";

export const panels: Array<{ id: WorkspacePanel; label: string; icon: typeof Box }> = [
  { id: "objects", label: "Объекты", icon: Box },
  { id: "rooms", label: "Комнаты", icon: Grid2X2 },
  { id: "roomDetails", label: "Свойства комнаты", icon: Home },
  { id: "settings", label: "Настройки", icon: Settings },
];
