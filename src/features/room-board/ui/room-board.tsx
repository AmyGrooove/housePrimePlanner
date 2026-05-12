import { Check, X } from "lucide-react";
import type { MouseEvent, ReactNode, WheelEvent } from "react";
import { useMemo } from "react";
import {
  formatLength,
  RoomIcon,
  roomIconLabels,
  roomIcons,
  unitConfig,
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
import { roomAreaFromWalls } from "@/entities/project/lib/geometry";
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
  UndoRedoControls,
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
  selectedWallObjectId: string | null;
  modeTool: WorkspaceTool;
  activePanel: WorkspacePanel | null;
  roomName: string;
  roomIcon: RoomIconName;
  roomColor: string;
  roomColors: string[];
  roomDuplicateCount: number;
  roomWallMeasureInterval: WallMeasureInterval;
  roomDefaultWallThickness: string;
  lengthUnit: LengthUnit;
  gridStep: number;
  dragStart: { x: number; y: number; originX: number; originY: number } | null;
  offset: { x: number; y: number };
  scale: number;
  error: string;
  exitConfirmOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  roomDraggedObjectVariableId: string | null;
  roomObjectPreview: { objectVariableId: string; wallId: string; position: number } | null;
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
  onRoomColorChange: (value: string) => void;
  onRoomDuplicateCountChange: (value: number) => void;
  onRoomWallMeasureIntervalChange: (value: WallMeasureInterval) => void;
  onRoomDefaultWallThicknessChange: (value: string) => void;
  onRoomDefaultWallThicknessCommit: () => void;
  onWallSelect: (wallId: string) => void;
  onWallDeselect: () => void;
  onWallEndpointSelect: (point: RoomBoundaryPoint) => void;
  onWallEndpointDragStart: (wallId: string, endpoint: "start" | "end") => void;
  onWallObjectDrop: (objectVariableId: string, wallId: string, point: RoomBoundaryPoint) => void;
  onWallObjectPreview: (objectVariableId: string, wallId: string, point: RoomBoundaryPoint) => void;
  onWallObjectMoveStart: (wallObjectId: string) => void;
  onWallObjectSelect: (wallObjectId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
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
  selectedWallObjectId,
  modeTool,
  activePanel,
  roomName,
  roomIcon,
  roomColor,
  roomColors,
  roomDuplicateCount,
  roomWallMeasureInterval,
  roomDefaultWallThickness,
  lengthUnit,
  gridStep,
  dragStart,
  offset,
  scale,
  error,
  exitConfirmOpen,
  canUndo,
  canRedo,
  roomDraggedObjectVariableId,
  roomObjectPreview,
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
  onRoomColorChange,
  onRoomDuplicateCountChange,
  onRoomWallMeasureIntervalChange,
  onRoomDefaultWallThicknessChange,
  onRoomDefaultWallThicknessCommit,
  onWallSelect,
  onWallDeselect,
  onWallEndpointSelect,
  onWallEndpointDragStart,
  onWallObjectDrop,
  onWallObjectPreview,
  onWallObjectMoveStart,
  onWallObjectSelect,
  onUndo,
  onRedo,
  onSettingsOpen,
  onExitRequest,
  onSaveRequest,
  onExitConfirm,
  onExitCancel,
}: RoomBoardProps) {
  const lengthUnitLabel = unitConfig(lengthUnit).label;
  const screenScale = 1 / Math.max(scale, 0.1);

  const objectSize = (objectVariableId: string) => {
    const object = objectVariables.find((item) => item.id === objectVariableId);
    return {
      width: object?.parameters.width ?? 600,
      thickness: object?.parameters.thickness ?? object?.parameters.depth ?? 100,
    };
  };

  const wallObjectRange = (wall: RoomWall, objectVariableId: string, position: number) => {
    const length = wallLength(wall);
    const { width } = objectSize(objectVariableId);
    const half = length ? Math.min(0.45, width / 2 / length) : 0;

    return {
      start: Math.max(0, position - half),
      end: Math.min(1, position + half),
    };
  };

  const renderMeasureText = (wall: RoomWall, startPosition: number, endPosition: number, offset: number) => {
    const length = wallLength(wall) * Math.abs(endPosition - startPosition);
    if (length < 1) {
      return null;
    }

    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const mid = wallPointAt(wall, (startPosition + endPosition) / 2);
    const normal = { x: -Math.sin(angle), y: Math.cos(angle) };

    return (
      <text
        transform={`rotate(${(angle * 180) / Math.PI} ${mid.x + normal.x * offset * screenScale} ${mid.y + normal.y * offset * screenScale})`}
        x={mid.x + normal.x * offset * screenScale}
        y={mid.y + normal.y * offset * screenScale}
        style={{ fontSize: 48, strokeWidth: 12 }}
      >
        {formatLength(length, lengthUnit)}
      </text>
    );
  };

  const renderWallMeasures = (wall: RoomWall) => {
    const objectRanges = wallObjects
      .filter((wallObject) => wallObject.wallId === wall.id)
      .map((wallObject) => ({
        id: wallObject.id,
        ...wallObjectRange(wall, wallObject.objectVariableId, wallObject.position),
      }))
      .sort((first, second) => first.start - second.start);
    const segments: Array<{ start: number; end: number; key: string }> = [];
    let cursor = 0;

    for (const range of objectRanges) {
      if (range.start > cursor) {
        segments.push({ start: cursor, end: range.start, key: `${range.id}-before` });
      }
      cursor = Math.max(cursor, range.end);
    }

    if (cursor < 1) {
      segments.push({ start: cursor, end: 1, key: `${wall.id}-after` });
    }

    return (
      <g className="room-wall-measures">
        {segments.map((segment) => (
          <g key={segment.key}>{renderMeasureText(wall, segment.start, segment.end, 18)}</g>
        ))}
      </g>
    );
  };

  const renderWallObject = (
    wallObject: RoomWallObject | { id: string; objectVariableId: string; wallId: string; position: number },
    preview = false,
  ) => {
    const wall = walls.find((item) => item.id === wallObject.wallId);
    const object = objectVariables.find((item) => item.id === wallObject.objectVariableId);

    if (!wall || !object) {
      return null;
    }

    const point = wallPointAt(wall, wallObject.position);
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    const { width, thickness } = objectSize(object.id);
    const visualWidth = Math.max(28, width);
    const visualHeight = Math.max(10, Math.min(24, thickness / 2));

    return (
      <g
        className={[
          "room-wall-object",
          preview ? "room-wall-object-preview" : "",
          selectedWallObjectId === wallObject.id ? "room-wall-object-selected" : "",
        ].join(" ")}
        key={wallObject.id}
        onClick={(event) => {
          if (preview) {
            return;
          }

          event.stopPropagation();
          onWallObjectSelect(wallObject.id);
        }}
        onMouseDown={(event) => {
          if (preview) {
            return;
          }

          event.stopPropagation();
          onWallObjectSelect(wallObject.id);
          onWallObjectMoveStart(wallObject.id);
        }}
        transform={`translate(${point.x} ${point.y}) rotate(${(angle * 180) / Math.PI})`}
      >
        <rect x={-visualWidth / 2} y={-visualHeight / 2} width={visualWidth} height={visualHeight} rx="4" />
        <text style={{ fontSize: 40, strokeWidth: 12 }} y={16}>
          {object.name}
        </text>
      </g>
    );
  };

  const endpoints = walls.flatMap((wall) => [
    { key: `${wall.id}-start`, wallId: wall.id, endpoint: "start" as const, point: wall.start },
    { key: `${wall.id}-end`, wallId: wall.id, endpoint: "end" as const, point: wall.end },
  ]);

  const calculatedArea = useMemo(() => {
    if (walls.length > 0) {
      return roomAreaFromWalls(walls).toFixed(2);
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
            <rect x="-20000" y="-20000" width="40000" height="40000" fill="url(#room-board-grid)" />
            {walls.map((wall) => (
              <g className="room-wall" key={wall.id}>
                <line
                  className={`room-line ${selectedWallId === wall.id ? "room-line-selected" : ""}`}
                  style={{ strokeWidth: Math.max(4 * screenScale, wall.thickness / 30) }}
                  x1={wall.start.x}
                  x2={wall.end.x}
                  y1={wall.start.y}
                  y2={wall.end.y}
                />
                <line
                  className="room-line-hitbox"
                  style={{ strokeWidth: 26 * screenScale }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onWallSelect(wall.id);
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  onDragOver={(event) => {
                    event.preventDefault();

                    if (roomDraggedObjectVariableId) {
                      onWallObjectPreview(roomDraggedObjectVariableId, wall.id, {
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const objectVariableId = event.dataTransfer.getData("text/plain") || roomDraggedObjectVariableId;

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
            {endpoints.map(({ key, wallId, endpoint, point }) => (
              <circle
                className="room-point room-point-end"
                cx={point.x}
                cy={point.y}
                key={key}
                style={{ strokeWidth: 3 * screenScale }}
                onClick={(event) => {
                  event.stopPropagation();

                  if (modeTool === "rooms") {
                    onWallEndpointSelect(point);
                  }
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();

                  if (modeTool === "cursor" && event.button === 0) {
                    onWallEndpointDragStart(wallId, endpoint);
                  }
                }}
                r={5 * screenScale}
              />
            ))}
            {draftStart && (
              <circle
                className="room-point room-point-start"
                cx={draftStart.x}
                cy={draftStart.y}
                r={7 * screenScale}
                style={{ strokeWidth: 3 * screenScale }}
              />
            )}
            {draftStart && previewPoint && (
              <line
                className="room-line room-line-preview"
                style={{ strokeWidth: 4 * screenScale }}
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
            {wallObjects.map((wallObject) => renderWallObject(wallObject))}
            {roomObjectPreview &&
              renderWallObject(
                {
                  id: "room-object-preview",
                  ...roomObjectPreview,
                },
                true,
              )}
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

        <UndoRedoControls
          canUndo={canUndo}
          canRedo={canRedo}
          className="room-undo-redo-controls"
          onRedo={onRedo}
          onUndo={onUndo}
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
                  <label className="field">
                    <span>Цвет</span>
                    <Select onValueChange={onRoomColorChange} value={roomColor}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {roomColors.map((color, index) => (
                            <SelectItem key={color} value={color}>
                              <span className="room-color-option">
                                <span className="room-color-option-swatch" style={{ backgroundColor: color }} />
                                Цвет {index + 1}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="field">
                    <span>Количество одинаковых комнат</span>
                    <input
                      min="1"
                      onChange={(event) => onRoomDuplicateCountChange(Math.max(1, Number(event.target.value) || 1))}
                      type="number"
                      value={roomDuplicateCount}
                    />
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
                              {interval} {lengthUnitLabel}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="field">
                    <span>Толщина новых стен</span>
                    <span className="unit-input">
                      <input
                        inputMode="decimal"
                        min="0"
                        onBlur={onRoomDefaultWallThicknessCommit}
                        onChange={(event) => onRoomDefaultWallThicknessChange(event.target.value)}
                        type="text"
                        value={roomDefaultWallThickness}
                      />
                      <span>{lengthUnitLabel}</span>
                    </span>
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
