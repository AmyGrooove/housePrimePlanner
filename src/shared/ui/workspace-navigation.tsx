import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { DraftingCompass, MousePointer2, Settings } from "lucide-react";
import { panels, type WorkspacePanel, type WorkspaceTool } from "@/shared/config/workspace";
import { IconAction } from "./icon-action";

type WorkspaceNavigationProps = {
  activePanel: WorkspacePanel | null;
  activeTool?: WorkspaceTool;
  hiddenPanels?: WorkspacePanel[];
  showRoomTool?: boolean;
  onPanelChange: (panel: WorkspacePanel | null) => void;
  onCursorSelect?: () => void;
  onRoomToolSelect?: () => void;
  onSettingsOpen: () => void;
};

export function WorkspaceNavigation({
  activePanel,
  activeTool,
  hiddenPanels = [],
  showRoomTool = false,
  onPanelChange,
  onCursorSelect,
  onRoomToolSelect,
  onSettingsOpen,
}: WorkspaceNavigationProps) {
  const cursorActive = activeTool ? activeTool === "cursor" : true;
  const roomToolActive = activeTool === "rooms";

  return (
    <>
      <ToggleGroupPrimitive.Root
        aria-label="Разделы"
        className="floating-tabs"
        onValueChange={(value) => onPanelChange(value ? (value as WorkspacePanel) : null)}
        type="single"
        value={activePanel ?? ""}
      >
        {panels
          .filter((panel) => panel.id !== "settings" && !hiddenPanels.includes(panel.id))
          .map((panel) => {
            const Icon = panel.icon;
            const isActive = activePanel === panel.id;

            return (
              <IconAction active={isActive} asChild key={panel.id} label={panel.label}>
                <ToggleGroupPrimitive.Item value={panel.id}>
                  <Icon />
                </ToggleGroupPrimitive.Item>
              </IconAction>
            );
          })}
      </ToggleGroupPrimitive.Root>

      <div className="canvas-tools" aria-label="Инструменты холста">
        <IconAction
          active={cursorActive}
          className="floating-tab-cursor"
          label="Курсор"
          onClick={onCursorSelect}
        >
          <MousePointer2 />
        </IconAction>

        {showRoomTool && (
          <IconAction active={roomToolActive} label="Контур комнаты" onClick={onRoomToolSelect}>
            <DraftingCompass />
          </IconAction>
        )}
      </div>

      <div className="settings-tools" aria-label="Настройки">
        <IconAction label="Настройки" onClick={onSettingsOpen}>
          <Settings />
        </IconAction>
      </div>
    </>
  );
}
