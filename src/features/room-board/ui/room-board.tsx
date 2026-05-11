import { Check, X } from "lucide-react";
import type { MouseEvent, ReactNode, WheelEvent } from "react";
import { useMemo } from "react";
import {
  formatLength,
  RoomIcon,
  roomIconLabels,
  roomIcons,
  wallLength,
  wallPointAt,
  type LengthUnit,
  type ObjectVariable,
  type RoomBoundaryPoint,
  type RoomIconName,
  type RoomWall,
  type RoomWallObject,
  type WallMeasureInterval,
} from "@/entities/project";
import { roomAreaFromWalls } from "@/entities/project/lib/geometry-service";
import type { WorkspacePanel, WorkspaceTool } from "@/shared/config/workspace";
import {
  ConfirmDialog,
  DialogContent,
  IconAction,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  WorkspaceNavigation,
  ZoomControls,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/ui";

type RoomBoardProps = {
  walls: RoomWall[];
  wallObjects: RoomWallObject[];
  objectVariables: ObjectVariable[];
  draftStart: RoomBoundaryPoint | null;
  previewPoint: RoomBoundaryPoint | null;
  selectedWallId: string | null;
  modeTool: WorkspaceTool;
  activePanel: WorkspacePanel | null;
  roomName: string;
  roomIcon: RoomIconName;
  roomWallMeasureInterval: WallMeasureInterval;
  roomDefaultWallThickness: string;
  lengthUnit: LengthUnit;
  gridStep: number;
  dragStart: { x: number; y: number; originX: number; originY: number } | null;
  offset: { x: number; y: number };
  scale: number;
  error: string;
  exitConfirmOpen: boolean;
  panelContent?: ReactNode;
  sideContent?: ReactNode;
  onBoardClick: (event: MouseEvent<SVGSVGElement>) => void;
  onBoardMouseMove: (event: MouseEvent<SVGSVGElement>) => void;
  onBoardMouseDown: (event: MouseEvent<SVGSVGElement>) => void;
  onBoardMouseUp: () => void;
  onBoardWheel: (event: WheelEvent<SVGSVGElement>) => void;
  onZoomDecrease: () => void;
  onZoomIncrease: () => void;
  onModeToolChange: (tool: WorkspaceTool) => void;
  onPanelChange: (panel: WorkspacePanel | null) => void;
  onRoomNameChange: (value: string) => void;
  onRoomIconChange: (value: RoomIconName) => void;
  onRoomWallMeasureIntervalChange: (value: WallMeasureInterval) => void;
  onRoomDefaultWallThicknessChange: (value: string) => void;
  onRoomDefaultWallThicknessCommit: () => void;
  onWallSelect: (wallId: string) => void;
  onWallDeselect: () => void;
  onWallEndpointSelect: (point: RoomBoundaryPoint) => void;
  onWallObjectDrop: (objectVariableId: string, wallId: string, point: RoomBoundaryPoint) => void;
  onSettingsOpen: () => void;
  onExitRequest: () => void;
  onSaveRequest: () => void;
  onExitConfirm: () => void;
  onExitCancel: () => void;
};

export function RoomBoard({
  walls,
  wallObjects,
  objectVariables,
  draftStart,
  previewPoint,
  selectedWallId,
  modeTool,
  activePanel,
  roomName,
  roomIcon,
  roomWallMeasureInterval,
  roomDefaultWallThickness,
  lengthUnit,
  gridStep,
  dragStart,
  offset,
  scale,
  error,
  exitConfirmOpen,
  panelContent,
  sideContent,
  onBoardClick,
  onBoardMouseMove,
  onBoardMouseDown,
  onBoardMouseUp,
  onBoardWheel,
  onZoomDecrease,
  onZoomIncrease,
  onModeToolChange,
  onPanelChange,
  onRoomNameChange,
  onRoomIconChange,
  onRoomWallMeasureIntervalChange,
  onRoomDefaultWallThicknessChange,
  onRoomDefaultWallThicknessCommit,
  onWallSelect,
  onWallDeselect,
  onWallEndpointSelect,
  onWallObjectDrop,
  onSettingsOpen,
  onExitRequest,
  onSaveRequest,
  onExitConfirm,
  onExitCancel,
}: RoomBoardProps) {
  const renderWallMeasures = (wall: RoomWall) => {
    const length = wallLength(wall);
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const mid = wallPointAt(wall, 0.5);
    const normal = { x: -Math.sin(angle), y: Math.cos(angle) };

    return (
      <g className="room-wall-measures">
        <text
          transform={`rotate(${(angle * 180) / Math.PI} ${mid.x + normal.x * 18} ${mid.y + normal.y * 18})`}
          x={mid.x + normal.x * 18}
          y={mid.y + normal.y * 18}
        >
          {formatLength(length, lengthUnit)}
        </text>
      </g>
    );
  };

  const endpoints = walls.flatMap((wall) => [
    { key: `${wall.id}-start`, point: wall.start },
    { key: `${wall.id}-end`, point: wall.end },
  ]);

  const calculatedArea = useMemo(() => {
    if (walls.length > 0) {
      const areaMm2 = roomAreaFromWalls(walls) as number;
      return (areaMm2 / 1_000_000).toFixed(2);
    }
    return "0.00";
  }, [walls]);

  return (
    <DialogContent
      contentClassName="room-board-backdrop"
      onOpenChange={(open) => {
        if (!open) {
          onExitRequest();
        }
      }}
      overlayClassName="room-board-overlay"
      title="Доска создания комнаты"
    >
      <section className="room-board-shell" aria-label="Доска создания комнаты">
        <svg
          className={[
            "room-drawing-board",
            modeTool === "rooms" ? "room-drawing-board-draw" : "",
            modeTool === "cursor" ? "room-drawing-board-pan" : "",
            dragStart ? "room-drawing-board-dragging" : "",
          ].join(" ")}
          onClick={(event) => {
            if (modeTool === "rooms") {
              onBoardClick(event);
              return;
            }

            onWallDeselect();
          }}
          onMouseDown={onBoardMouseDown}
          onMouseLeave={onBoardMouseUp}
          onMouseMove={onBoardMouseMove}
          onMouseUp={onBoardMouseUp}
          onWheel={onBoardWheel}
          preserveAspectRatio="none"
          viewBox="0 0 960 560"
        >
          <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
            <defs>
              <pattern id="room-board-grid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
                <path d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`} fill="none" stroke="rgba(255,255,255,0.08)" />
              </pattern>
            </defs>
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#room-board-grid)" />
            {walls.map((wall) => (
              <g className="room-wall" key={wall.id}>
                <line
                  className={`room-line ${selectedWallId === wall.id ? "room-line-selected" : ""}`}
                  style={{ strokeWidth: Math.max(4, wall.thickness / 30) }}
                  x1={wall.start.x}
                  x2={wall.end.x}
                  y1={wall.start.y}
                  y2={wall.end.y}
                />
                <line
                  className="room-line-hitbox"
                  onClick={(event) => {
                    event.stopPropagation();
                    onWallSelect(wall.id);
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const objectVariableId = event.dataTransfer.getData("text/plain");

                    if (objectVariableId) {
                      onWallObjectDrop(objectVariableId, wall.id, {
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }
                  }}
                  x1={wall.start.x}
                  x2={wall.end.x}
                  y1={wall.start.y}
                  y2={wall.end.y}
                />
                {renderWallMeasures(wall)}
              </g>
            ))}
            {endpoints.map(({ key, point }) => (
              <circle
                className="room-point room-point-end"
                cx={point.x}
                cy={point.y}
                key={key}
                onClick={(event) => {
                  event.stopPropagation();

                  if (modeTool === "rooms") {
                    onWallEndpointSelect(point);
                  }
                }}
                onMouseDown={(event) => event.stopPropagation()}
                r={5}
              />
            ))}
            {draftStart && (
              <circle className="room-point room-point-start" cx={draftStart.x} cy={draftStart.y} r={7} />
            )}
            {draftStart && previewPoint && (
              <line
                className="room-line room-line-preview"
                x1={draftStart.x}
                x2={previewPoint.x}
                y1={draftStart.y}
                y2={previewPoint.y}
              />
            )}
            {draftStart &&
              previewPoint &&
              renderWallMeasures({
                id: "preview",
                start: draftStart,
                end: previewPoint,
                thickness: 0,
              })}
            {wallObjects.map((wallObject) => {
              const wall = walls.find((item) => item.id === wallObject.wallId);
              const object = objectVariables.find((item) => item.id === wallObject.objectVariableId);

              if (!wall || !object) {
                return null;
              }

              const point = wallPointAt(wall, wallObject.position);

              return (
                <g className="room-wall-object" key={wallObject.id} transform={`translate(${point.x} ${point.y})`}>
                  <rect x="-18" y="-12" width="36" height="24" rx="4" />
                  <text y="4">{object.name}</text>
                </g>
              );
            })}
          </g>
        </svg>

        <WorkspaceNavigation
          activePanel={activePanel}
          activeTool={modeTool}
          hiddenPanels={["rooms"]}
          onCursorSelect={() => onModeToolChange("cursor")}
          onPanelChange={onPanelChange}
          onRoomToolSelect={() => onModeToolChange("rooms")}
          onSettingsOpen={onSettingsOpen}
          showRoomTool
        />

        {panelContent}

        {sideContent}

        {activePanel === "roomDetails" && (
          <section className="floating-modal room-properties-panel" aria-label="Свойства комнаты">
            <div className="modal-header">
              <div>
                <h2>Свойства комнаты</h2>
              </div>
            </div>
            <div className="modal-content">
              <Tabs defaultValue="main">
                <TabsList>
                  <TabsTrigger value="main">Основное</TabsTrigger>
                  <TabsTrigger value="settings">Свойства</TabsTrigger>
                </TabsList>

                <TabsContent value="main">
                  <label className="field">
                    <span>Название</span>
                    <input
                      onChange={(event) => onRoomNameChange(event.target.value)}
                      placeholder="Например: Гостиная"
                      type="text"
                      value={roomName}
                    />
                  </label>
                  <label className="field">
                    <span>Иконка</span>
                    <Select onValueChange={(value) => onRoomIconChange(value as RoomIconName)} value={roomIcon}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {roomIcons.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              <span className="type-option">
                                <RoomIcon icon={icon} />
                                {roomIconLabels[icon]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </label>
                  {walls.length > 0 && (
                    <div className="room-stats">
                      <div className="room-stat">
                        <span className="room-stat-label">Площадь:</span>
                        <span className="room-stat-value">{calculatedArea} м²</span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="settings">
                  <label className="field">
                    <span>Шаг создания стен</span>
                    <Select
                      onValueChange={(value) => onRoomWallMeasureIntervalChange(Number(value) as WallMeasureInterval)}
                      value={String(roomWallMeasureInterval)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {([1, 5, 10, 15, 20] as WallMeasureInterval[]).map((interval) => (
                            <SelectItem key={interval} value={String(interval)}>
                              {interval}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="field">
                    <span>Толщина новых стен</span>
                    <input
                      inputMode="decimal"
                      min="0"
                      onBlur={onRoomDefaultWallThicknessCommit}
                      onChange={(event) => onRoomDefaultWallThicknessChange(event.target.value)}
                      type="text"
                      value={roomDefaultWallThickness}
                    />
                  </label>
                </TabsContent>
              </Tabs>
            </div>
          </section>
        )}

        <ZoomControls onDecrease={onZoomDecrease} onIncrease={onZoomIncrease} scale={scale} />

        <IconAction className="room-mode-save" label="Сохранить комнату" onClick={onSaveRequest}>
          <Check />
        </IconAction>

        <IconAction className="room-mode-close" label="Выйти из режима комнаты" onClick={onExitRequest}>
          <X />
        </IconAction>

        {error && <div className="room-mode-error form-error">{error}</div>}
      </section>

      {exitConfirmOpen && (
        <ConfirmDialog
          confirmLabel="Выйти"
          description="Несохраненная комната будет сброшена."
          onCancel={onExitCancel}
          onConfirm={onExitConfirm}
          title="Выйти из режима комнаты?"
        />
      )}
    </DialogContent>
  );
}
