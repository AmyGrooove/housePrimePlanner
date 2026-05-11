import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, WheelEvent } from "react";
import {
  constrainPoint,
  createId,
  distanceBetween,
  formatLength,
  parseLength,
  projectPointToWall,
  roomAreaFromWalls,
  unitConfig,
  wallLength,
  usePlannerStore,
  type LengthUnit,
  type ObjectParameterKey,
  type ObjectTypeId,
  type ObjectVariable,
  type Room,
  type RoomBoundaryPoint,
  type RoomIconName,
  type RoomWall,
  type RoomWallObject,
  type WallMeasureInterval,
} from "@/entities/project";
import { ObjectVariableDialog } from "@/features/object-variable-editor";
import { RoomBoard } from "@/features/room-board";
import { RoomEditorDialog } from "@/features/room-editor";
import { SettingsDialog } from "@/features/settings-panel";
import { Button, ConfirmDialog } from "@/shared/ui";
import {
  CanvasSurface,
  WorkspaceNavigation,
  ZoomControls,
  type WorkspacePanel,
  type WorkspaceTool,
} from "@/widgets/planner-workspace";
import { ObjectListPanel, RoomListPanel } from "@/widgets/workspace-panel";

export function App() {
  const [activePanel, setActivePanel] = useState<WorkspacePanel | null>("objects");
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; originX: number; originY: number } | null>(
    null,
  );
  const snapshot = usePlannerStore((state) => state.present);
  const setSnapshot = usePlannerStore((state) => state.setSnapshot);
  const lengthUnit = snapshot.settings.lengthUnit;
  const selectedLengthUnit = unitConfig(lengthUnit);
  const defaultType = snapshot.objectTypes[0]?.id ?? "door";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<ObjectTypeId>(defaultType);
  const [name, setName] = useState("");
  const [parameterValues, setParameterValues] = useState<Partial<Record<ObjectParameterKey, string>>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [roomBoardOpen, setRoomBoardOpen] = useState(false);
  const [roomBoardEditingId, setRoomBoardEditingId] = useState<string | null>(null);
  const [roomWalls, setRoomWalls] = useState<RoomWall[]>([]);
  const [roomWallObjects, setRoomWallObjects] = useState<RoomWallObject[]>([]);
  const [roomDraftStart, setRoomDraftStart] = useState<RoomBoundaryPoint | null>(null);
  const [roomPreviewPoint, setRoomPreviewPoint] = useState<RoomBoundaryPoint | null>(null);
  const [roomCanvasOffset, setRoomCanvasOffset] = useState({ x: 0, y: 0 });
  const [roomCanvasScale, setRoomCanvasScale] = useState(1);
  const [roomDragStart, setRoomDragStart] = useState<{
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [roomError, setRoomError] = useState("");
  const [roomModeTool, setRoomModeTool] = useState<WorkspaceTool>("rooms");
  const [roomActivePanel, setRoomActivePanel] = useState<WorkspacePanel | null>("roomDetails");
  const [selectedRoomWallId, setSelectedRoomWallId] = useState<string | null>(null);
  const [selectedWallLength, setSelectedWallLength] = useState("");
  const [selectedWallThickness, setSelectedWallThickness] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomIcon, setNewRoomIcon] = useState<RoomIconName>("living");
  const [newRoomWallMeasureInterval, setNewRoomWallMeasureInterval] = useState<WallMeasureInterval>(10);
  const [newRoomDefaultWallThickness, setNewRoomDefaultWallThickness] = useState(120);
  const [newRoomDefaultWallThicknessInput, setNewRoomDefaultWallThicknessInput] = useState("");
  const [roomExitConfirmOpen, setRoomExitConfirmOpen] = useState(false);
  const [roomEditingId, setRoomEditingId] = useState<string | null>(null);
  const [roomDeleteId, setRoomDeleteId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomArea, setRoomArea] = useState("");
  const [roomFormError, setRoomFormError] = useState("");
  const previousLengthUnit = useRef(lengthUnit);
  const selectedType = snapshot.objectTypes.find((type) => type.id === typeId) ?? snapshot.objectTypes[0];
  const selectedRoomWall = roomWalls.find((wall) => wall.id === selectedRoomWallId) ?? null;

  const setZoom = (nextScale: number) => {
    setCanvasScale(Math.min(2.5, Math.max(0.35, nextScale)));
  };

  const setRoomZoom = (nextScale: number) => {
    setRoomCanvasScale(Math.min(2.5, Math.max(0.35, nextScale)));
  };

  useEffect(() => {
    if (previousLengthUnit.current === lengthUnit) {
      return;
    }

    const previousUnit = previousLengthUnit.current;

    setParameterValues((values) => {
      const nextValues: Partial<Record<ObjectParameterKey, string>> = {};

      for (const [key, value] of Object.entries(values) as Array<[ObjectParameterKey, string]>) {
        const valueMm = parseLength(value, previousUnit);
        nextValues[key] = valueMm ? formatLength(valueMm, lengthUnit) : value;
      }

      return nextValues;
    });
    previousLengthUnit.current = lengthUnit;
  }, [lengthUnit]);

  useEffect(() => {
    if (!selectedRoomWall) {
      setSelectedWallLength("");
      setSelectedWallThickness("");
      return;
    }

    setSelectedWallLength(formatLength(wallLength(selectedRoomWall), lengthUnit));
    setSelectedWallThickness(formatLength(selectedRoomWall.thickness, lengthUnit));
  }, [lengthUnit, selectedRoomWall]);

  const resetForm = (nextTypeId: ObjectTypeId = defaultType) => {
    setEditingId(null);
    setTypeId(nextTypeId);
    setName("");
    setParameterValues({});
    setFormError("");
  };

  const startCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const editVariable = (variable: ObjectVariable) => {
    const nextValues: Partial<Record<ObjectParameterKey, string>> = {};

    for (const [key, value] of Object.entries(variable.parameters) as Array<
      [ObjectParameterKey, number | undefined]
    >) {
      nextValues[key] = formatLength(value, lengthUnit);
    }

    setEditingId(variable.id);
    setTypeId(variable.typeId);
    setName(variable.name);
    setParameterValues(nextValues);
    setFormOpen(true);
    setFormError("");
  };

  const closeVariableForm = () => {
    resetForm();
    setFormOpen(false);
  };

  const confirmDeleteVariable = () => {
    if (!deleteId) {
      return;
    }

    setSnapshot({
      ...snapshot,
      objectVariables: snapshot.objectVariables.filter((variable) => variable.id !== deleteId),
    });

    if (editingId === deleteId) {
      closeVariableForm();
    }

    setDeleteId(null);
  };

  const editRoom = (room: Room) => {
    const walls =
      room.walls ??
      room.boundary?.map((point, index, points) => ({
        id: createId("wall"),
        start: point,
        end: points[(index + 1) % points.length],
        thickness: room.defaultWallThickness ?? 120,
      })) ??
      [];

    setRoomBoardEditingId(room.id);
    setRoomWalls(walls);
    setRoomWallObjects(room.wallObjects ?? []);
    setRoomDraftStart(null);
    setRoomPreviewPoint(null);
    setRoomError("");
    setRoomCanvasOffset({ x: 0, y: 0 });
    setRoomCanvasScale(1);
    setRoomDragStart(null);
    setSelectedRoomWallId(null);
    setNewRoomName(room.name);
    setNewRoomIcon(room.icon ?? "living");
    setNewRoomWallMeasureInterval(room.wallMeasureInterval ?? 10);
    setNewRoomDefaultWallThickness(room.defaultWallThickness ?? 120);
    setNewRoomDefaultWallThicknessInput(formatLength(room.defaultWallThickness ?? 120, lengthUnit));
    setRoomModeTool("cursor");
    setRoomActivePanel("roomDetails");
    setRoomExitConfirmOpen(false);
    setRoomBoardOpen(true);
  };

  const closeRoomEditor = () => {
    setRoomEditingId(null);
    setRoomName("");
    setRoomArea("");
    setRoomFormError("");
  };

  const saveRoom = () => {
    if (!roomEditingId) {
      return;
    }

    const trimmedName = roomName.trim();
    const parsedArea = Number(roomArea);

    if (!trimmedName) {
      setRoomFormError("Укажите название комнаты.");
      return;
    }

    if (!Number.isFinite(parsedArea) || parsedArea <= 0) {
      setRoomFormError("Укажите положительную площадь.");
      return;
    }

    setSnapshot({
      ...snapshot,
      project: {
        ...snapshot.project,
        rooms: snapshot.project.rooms.map((room) =>
          room.id === roomEditingId ? { ...room, name: trimmedName, area: parsedArea } : room,
        ),
      },
    });
    closeRoomEditor();
  };

  const confirmDeleteRoom = () => {
    if (!roomDeleteId) {
      return;
    }

    setSnapshot({
      ...snapshot,
      project: {
        ...snapshot.project,
        rooms: snapshot.project.rooms.filter((room) => room.id !== roomDeleteId),
      },
    });

    if (roomEditingId === roomDeleteId) {
      closeRoomEditor();
    }

    setRoomDeleteId(null);
  };

  const saveVariable = () => {
    if (!selectedType) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError("Укажите название объекта.");
      return;
    }

    const hasSameName = snapshot.objectVariables.some(
      (variable) =>
        variable.id !== editingId && variable.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    if (hasSameName) {
      setFormError("Объект с таким названием уже существует.");
      return;
    }

    const parameters: Partial<Record<ObjectParameterKey, number>> = {};

    for (const parameter of selectedType.parameters) {
      const parsed = parseLength(parameterValues[parameter.key] ?? "", lengthUnit);

      if (!parsed) {
        setFormError(`Заполните параметр "${parameter.label}" положительным числом.`);
        return;
      }

      parameters[parameter.key] = parsed;
    }

    const now = new Date().toISOString();
    const nextVariable: ObjectVariable = {
      id: editingId ?? createId("object"),
      typeId,
      name: trimmedName,
      parameters,
      createdAt:
        snapshot.objectVariables.find((variable) => variable.id === editingId)?.createdAt ?? now,
      updatedAt: now,
    };

    setSnapshot({
      ...snapshot,
      objectVariables: editingId
        ? snapshot.objectVariables.map((variable) =>
            variable.id === editingId ? nextVariable : variable,
          )
        : [...snapshot.objectVariables, nextVariable],
    });
    resetForm(typeId);
    setFormOpen(false);
  };

  const changeUnit = (unit: LengthUnit) => {
    setSnapshot({
      ...snapshot,
      settings: {
        ...snapshot.settings,
        lengthUnit: unit,
      },
    });
  };

  const changeRoomDefaultWallThickness = (value: string) => {
    setNewRoomDefaultWallThicknessInput(value);
    const parsed = parseLength(value, lengthUnit);

    if (!parsed) {
      return;
    }

    setNewRoomDefaultWallThickness(parsed);
  };

  const commitRoomDefaultWallThickness = () => {
    setNewRoomDefaultWallThicknessInput(formatLength(newRoomDefaultWallThickness, lengthUnit));
  };

  const startCanvasDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    setDragStart({
      x: event.clientX,
      y: event.clientY,
      originX: canvasOffset.x,
      originY: canvasOffset.y,
    });
  };

  const moveCanvas = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragStart) {
      return;
    }

    setCanvasOffset({
      x: dragStart.originX + event.clientX - dragStart.x,
      y: dragStart.originY + event.clientY - dragStart.y,
    });
  };

  const zoomCanvas = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom(canvasScale - event.deltaY * 0.001);
  };

  const openRoomBoard = () => {
    const nextNumber = snapshot.project.rooms.length + 1;

    setRoomBoardEditingId(null);
    setRoomWalls([]);
    setRoomWallObjects([]);
    setRoomDraftStart(null);
    setRoomPreviewPoint(null);
    setRoomError("");
    setRoomCanvasOffset({ x: 0, y: 0 });
    setRoomCanvasScale(1);
    setRoomDragStart(null);
    setSelectedRoomWallId(null);
    setNewRoomName(`Комната ${nextNumber}`);
    setNewRoomIcon("living");
    setNewRoomWallMeasureInterval(10);
    setNewRoomDefaultWallThickness(120);
    setNewRoomDefaultWallThicknessInput(formatLength(120, lengthUnit));
    setRoomModeTool("rooms");
    setRoomActivePanel("roomDetails");
    setRoomExitConfirmOpen(false);
    setRoomBoardOpen(true);
  };

  const closeRoomBoard = () => {
    setRoomBoardOpen(false);
    setRoomBoardEditingId(null);
    setRoomWalls([]);
    setRoomWallObjects([]);
    setRoomDraftStart(null);
    setRoomPreviewPoint(null);
    setRoomError("");
    setRoomDragStart(null);
    setSelectedRoomWallId(null);
    setNewRoomName("");
    setNewRoomIcon("living");
    setNewRoomWallMeasureInterval(10);
    setNewRoomDefaultWallThickness(120);
    setNewRoomDefaultWallThicknessInput("");
    setRoomModeTool("rooms");
    setRoomActivePanel("roomDetails");
    setRoomExitConfirmOpen(false);
  };

  const getBoardPoint = (event: MouseEvent<SVGSVGElement>): RoomBoundaryPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return getBoardPointFromClient(event.clientX, event.clientY, bounds);
  };

  const wallSnapStep = () => Math.max(1, newRoomWallMeasureInterval * selectedLengthUnit.multiplier);

  const snapBoardPoint = (point: RoomBoundaryPoint): RoomBoundaryPoint => {
    const step = wallSnapStep();

    return {
      x: Math.round(point.x / step) * step,
      y: Math.round(point.y / step) * step,
    };
  };

  const wallEndpoints = () =>
    roomWalls.flatMap((wall) => [
      { point: wall.start },
      { point: wall.end },
    ]);

  const findNearestWallEndpoint = (point: RoomBoundaryPoint) => {
    const endpoints = wallEndpoints();

    return endpoints.find((endpoint) => distanceBetween(endpoint.point, point) <= 14)?.point ?? null;
  };

  const constrainAndSnapWallEnd = (start: RoomBoundaryPoint, rawPoint: RoomBoundaryPoint) => {
    const constrained = constrainPoint(start, rawPoint);
    const length = distanceBetween(start, constrained);

    if (!length) {
      return start;
    }

    const step = wallSnapStep();
    const snappedLength = Math.max(step, Math.round(length / step) * step);
    const dx = (constrained.x - start.x) / length;
    const dy = (constrained.y - start.y) / length;

    return {
      x: Math.round(start.x + dx * snappedLength),
      y: Math.round(start.y + dy * snappedLength),
    };
  };

  const getBoardPointFromClient = (clientX: number, clientY: number, bounds: DOMRect): RoomBoundaryPoint => {
    return {
      x: Math.round((((clientX - bounds.left) / bounds.width) * 960 - roomCanvasOffset.x) / roomCanvasScale),
      y: Math.round((((clientY - bounds.top) / bounds.height) * 560 - roomCanvasOffset.y) / roomCanvasScale),
    };
  };

  const startRoomCanvasDrag = (event: MouseEvent<SVGSVGElement>) => {
    if (roomModeTool !== "cursor" || event.button !== 0) {
      return;
    }

    setRoomDragStart({
      x: event.clientX,
      y: event.clientY,
      originX: roomCanvasOffset.x,
      originY: roomCanvasOffset.y,
    });
  };

  const moveRoomCanvas = (event: MouseEvent<SVGSVGElement>) => {
    if (!roomDragStart) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - roomDragStart.x) / bounds.width) * 960;
    const dy = ((event.clientY - roomDragStart.y) / bounds.height) * 560;

    setRoomCanvasOffset({
      x: roomDragStart.originX + dx,
      y: roomDragStart.originY + dy,
    });
  };

  const moveRoomBoardPointer = (event: MouseEvent<SVGSVGElement>) => {
    if (roomModeTool === "cursor") {
      moveRoomCanvas(event);
      return;
    }

    if (roomModeTool === "rooms") {
      previewRoomLine(event);
    }
  };

  const zoomRoomCanvas = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    setRoomZoom(roomCanvasScale - event.deltaY * 0.001);
  };

  const saveRoomBoard = () => {
    const trimmedName = newRoomName.trim();

    if (!trimmedName) {
      setRoomError("Укажите название комнаты.");
      setRoomActivePanel("roomDetails");
      return;
    }

    if (roomWalls.length === 0) {
      setRoomError("Создайте хотя бы одну стену.");
      setRoomModeTool("rooms");
      return;
    }

    const roomPayload = {
      name: trimmedName,
      area: roomAreaFromWalls(roomWalls),
      icon: newRoomIcon,
      wallMeasureInterval: newRoomWallMeasureInterval,
      defaultWallThickness: newRoomDefaultWallThickness,
      walls: roomWalls,
      wallObjects: roomWallObjects,
    };

    setSnapshot({
      ...snapshot,
      project: {
        ...snapshot.project,
        rooms: roomBoardEditingId
          ? snapshot.project.rooms.map((room) =>
              room.id === roomBoardEditingId
                ? {
                    ...room,
                    ...roomPayload,
                  }
                : room,
            )
          : [
              ...snapshot.project.rooms,
              {
                id: createId("room"),
                status: "planned",
                notes: "Комната создана на доске стен.",
                ...roomPayload,
              },
            ],
      },
    });
    closeRoomBoard();
  };

  const addRoomPoint = (event: MouseEvent<SVGSVGElement>) => {
    const rawPoint = getBoardPoint(event);

    if (!roomDraftStart) {
      const startPoint = roomWalls.length === 0 ? snapBoardPoint(rawPoint) : findNearestWallEndpoint(rawPoint);

      if (!startPoint) {
        setRoomError("Новую стену можно начать только с крайней точки существующей стены.");
        return;
      }

      setRoomDraftStart(startPoint);
      setRoomError("");
      return;
    }

    const nextPoint = constrainAndSnapWallEnd(roomDraftStart, rawPoint);

    if (distanceBetween(nextPoint, roomDraftStart) < 12) {
      setRoomError("Линия слишком короткая.");
      return;
    }

    setRoomWalls((walls) => [
      ...walls,
      {
        id: createId("wall"),
        start: roomDraftStart,
        end: nextPoint,
        thickness: newRoomDefaultWallThickness,
      },
    ]);
    setRoomDraftStart(null);
    setRoomPreviewPoint(null);
    setRoomModeTool("cursor");
    setRoomError("");
  };

  const previewRoomLine = (event: MouseEvent<SVGSVGElement>) => {
    if (!roomDraftStart) {
      setRoomPreviewPoint(null);
      return;
    }

    const rawPoint = getBoardPoint(event);
    setRoomPreviewPoint(constrainAndSnapWallEnd(roomDraftStart, rawPoint));
  };

  const startRoomWallFromEndpoint = (point: RoomBoundaryPoint) => {
    setRoomDraftStart(point);
    setRoomPreviewPoint(null);
    setRoomModeTool("rooms");
    setRoomError("");
  };

  const selectRoomWall = (wallId: string) => {
    const wall = roomWalls.find((item) => item.id === wallId);

    setSelectedRoomWallId(wallId);
    setRoomModeTool("cursor");

    if (wall) {
      setSelectedWallLength(formatLength(wallLength(wall), lengthUnit));
      setSelectedWallThickness(formatLength(wall.thickness, lengthUnit));
    }
  };

  const deselectRoomWall = () => {
    setSelectedRoomWallId(null);
    setSelectedWallLength("");
    setSelectedWallThickness("");
  };

  const changeSelectedWallLength = (value: string) => {
    setSelectedWallLength(value);
    const parsed = parseLength(value, lengthUnit);

    if (!parsed || !selectedRoomWall) {
      return;
    }

    const snappedParsed = Math.max(wallSnapStep(), Math.round(parsed / wallSnapStep()) * wallSnapStep());
    const currentLength = wallLength(selectedRoomWall);

    if (!currentLength) {
      return;
    }

    const dx = (selectedRoomWall.end.x - selectedRoomWall.start.x) / currentLength;
    const dy = (selectedRoomWall.end.y - selectedRoomWall.start.y) / currentLength;
    const previousEnd = selectedRoomWall.end;
    const nextEnd = {
      x: Math.round(selectedRoomWall.start.x + dx * snappedParsed),
      y: Math.round(selectedRoomWall.start.y + dy * snappedParsed),
    };
    const isAttachedToPreviousEnd = (point: RoomBoundaryPoint) => distanceBetween(point, previousEnd) <= 2;

    setRoomWalls((walls) =>
      walls.map((wall) =>
        wall.id === selectedRoomWall.id
          ? {
              ...wall,
              end: nextEnd,
            }
          : {
              ...wall,
              start: isAttachedToPreviousEnd(wall.start) ? nextEnd : wall.start,
              end: isAttachedToPreviousEnd(wall.end) ? nextEnd : wall.end,
            },
      ),
    );
  };

  const commitSelectedWallLength = () => {
    if (selectedRoomWall) {
      setSelectedWallLength(formatLength(wallLength(selectedRoomWall), lengthUnit));
    }
  };

  const resnapRoomWallsToStep = (interval: WallMeasureInterval) => {
    const step = Math.max(1, interval * selectedLengthUnit.multiplier);

    setRoomWalls((walls) =>
      walls.map((wall) => {
        const length = wallLength(wall);

        if (!length) {
          return wall;
        }

        const snappedLength = Math.max(step, Math.round(length / step) * step);
        const dx = (wall.end.x - wall.start.x) / length;
        const dy = (wall.end.y - wall.start.y) / length;

        return {
          ...wall,
          end: {
            x: Math.round(wall.start.x + dx * snappedLength),
            y: Math.round(wall.start.y + dy * snappedLength),
          },
        };
      }),
    );
  };

  const changeRoomWallMeasureInterval = (interval: WallMeasureInterval) => {
    setNewRoomWallMeasureInterval(interval);
    resnapRoomWallsToStep(interval);
  };

  const changeSelectedWallThickness = (value: string) => {
    setSelectedWallThickness(value);
    const parsed = parseLength(value, lengthUnit);

    if (!parsed || !selectedRoomWall) {
      return;
    }

    setRoomWalls((walls) =>
      walls.map((wall) => (wall.id === selectedRoomWall.id ? { ...wall, thickness: parsed } : wall)),
    );
  };

  const commitSelectedWallThickness = () => {
    if (selectedRoomWall) {
      setSelectedWallThickness(formatLength(selectedRoomWall.thickness, lengthUnit));
    }
  };

  const commitWallFieldOnEnter = (event: KeyboardEvent<HTMLInputElement>, onCommit: () => void) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      onCommit();
    }
  };

  const deleteSelectedWall = () => {
    if (!selectedRoomWallId) {
      return;
    }

    setRoomWalls((walls) => walls.filter((wall) => wall.id !== selectedRoomWallId));
    setRoomWallObjects((objects) => objects.filter((object) => object.wallId !== selectedRoomWallId));
    setSelectedRoomWallId(null);
    setSelectedWallLength("");
    setSelectedWallThickness("");
    setRoomDraftStart(null);
    setRoomPreviewPoint(null);
    setRoomError("");
  };

  const addWallObject = (objectVariableId: string, wallId: string, clientPoint: RoomBoundaryPoint) => {
    const wall = roomWalls.find((item) => item.id === wallId);
    const svg = document.querySelector<SVGSVGElement>(".room-drawing-board");

    if (!wall || !svg) {
      return;
    }

    const point = getBoardPointFromClient(clientPoint.x, clientPoint.y, svg.getBoundingClientRect());

    setRoomWallObjects((objects) => [
      ...objects,
      {
        id: createId("wall-object"),
        objectVariableId,
        wallId,
        position: projectPointToWall(point, wall),
        side: "inside",
        offset: 0,
      },
    ]);
    setRoomError("");
  };

  return (
    <div className="canvas-app">
      <CanvasSurface
        dragStart={dragStart}
        offset={canvasOffset}
        onMouseDown={startCanvasDrag}
        onMouseMove={moveCanvas}
        onMouseUp={() => setDragStart(null)}
        onWheel={zoomCanvas}
        scale={canvasScale}
      />

      <WorkspaceNavigation
        activePanel={activePanel}
        hiddenPanels={["roomDetails"]}
        onPanelChange={setActivePanel}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      <ZoomControls
        onDecrease={() => setZoom(canvasScale - 0.1)}
        onIncrease={() => setZoom(canvasScale + 0.1)}
        scale={canvasScale}
      />

      {activePanel === "objects" && (
        <ObjectListPanel
          onCreate={startCreate}
          onDelete={setDeleteId}
          onEdit={editVariable}
          snapshot={snapshot}
        />
      )}

      {activePanel === "rooms" && (
        <RoomListPanel
          onCreate={openRoomBoard}
          onDelete={setRoomDeleteId}
          onEdit={editRoom}
          rooms={snapshot.project.rooms}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          lengthUnit={lengthUnit}
          onChangeUnit={changeUnit}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {formOpen && (
        <ObjectVariableDialog
          editingId={editingId}
          error={formError}
          lengthUnit={lengthUnit}
          name={name}
          objectTypes={snapshot.objectTypes}
          onClose={closeVariableForm}
          onNameChange={setName}
          onParameterChange={(key, value) =>
            setParameterValues((values) => ({
              ...values,
              [key]: value,
            }))
          }
          onSave={saveVariable}
          onTypeChange={(value) => {
            setTypeId(value);
            setParameterValues({});
            setFormError("");
          }}
          parameterValues={parameterValues}
          typeId={typeId}
        />
      )}

      {roomEditingId && (
        <RoomEditorDialog
          area={roomArea}
          error={roomFormError}
          name={roomName}
          onAreaChange={setRoomArea}
          onClose={closeRoomEditor}
          onNameChange={setRoomName}
          onSave={saveRoom}
        />
      )}

      {roomBoardOpen && (
        <RoomBoard
          error={roomError}
          activePanel={roomActivePanel}
          exitConfirmOpen={roomExitConfirmOpen}
          draftStart={roomDraftStart}
          dragStart={roomDragStart}
          gridStep={wallSnapStep()}
          lengthUnit={lengthUnit}
          modeTool={roomModeTool}
          offset={roomCanvasOffset}
          onBoardClick={addRoomPoint}
          onBoardMouseDown={startRoomCanvasDrag}
          onBoardMouseMove={moveRoomBoardPointer}
          onBoardMouseUp={() => setRoomDragStart(null)}
          onBoardWheel={zoomRoomCanvas}
          onExitCancel={() => setRoomExitConfirmOpen(false)}
          onExitConfirm={closeRoomBoard}
          onExitRequest={() => setRoomExitConfirmOpen(true)}
          onModeToolChange={setRoomModeTool}
          onPanelChange={setRoomActivePanel}
          onRoomIconChange={setNewRoomIcon}
          onRoomDefaultWallThicknessChange={changeRoomDefaultWallThickness}
          onRoomDefaultWallThicknessCommit={commitRoomDefaultWallThickness}
          onRoomWallMeasureIntervalChange={changeRoomWallMeasureInterval}
          onRoomNameChange={setNewRoomName}
          onSaveRequest={saveRoomBoard}
          onSettingsOpen={() => setSettingsOpen(true)}
          onWallDeselect={deselectRoomWall}
          onWallEndpointSelect={startRoomWallFromEndpoint}
          onWallObjectDrop={addWallObject}
          onWallSelect={selectRoomWall}
          onZoomDecrease={() => setRoomZoom(roomCanvasScale - 0.1)}
          onZoomIncrease={() => setRoomZoom(roomCanvasScale + 0.1)}
          panelContent={
            roomActivePanel === "objects" ? (
              <ObjectListPanel
                draggableObjects
                onCreate={startCreate}
                onDelete={setDeleteId}
                onEdit={editVariable}
                snapshot={snapshot}
              />
            ) : null
          }
          objectVariables={snapshot.objectVariables}
          previewPoint={roomPreviewPoint}
          roomIcon={newRoomIcon}
          roomName={newRoomName}
          roomDefaultWallThickness={newRoomDefaultWallThicknessInput}
          roomWallMeasureInterval={newRoomWallMeasureInterval}
          scale={roomCanvasScale}
          selectedWallId={selectedRoomWallId}
          sideContent={
            selectedRoomWall ? (
              <section className="room-wall-editor" aria-label="Редактирование стены">
                <h3>Стена</h3>
                <label className="field">
                  <span>Длина, {selectedLengthUnit.label}</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    onBlur={commitSelectedWallLength}
                    onChange={(event) => changeSelectedWallLength(event.target.value)}
                    onKeyDown={(event) => commitWallFieldOnEnter(event, commitSelectedWallLength)}
                    type="text"
                    value={selectedWallLength}
                  />
                </label>
                <label className="field">
                  <span>Толщина, {selectedLengthUnit.label}</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    onBlur={commitSelectedWallThickness}
                    onChange={(event) => changeSelectedWallThickness(event.target.value)}
                    onKeyDown={(event) => commitWallFieldOnEnter(event, commitSelectedWallThickness)}
                    type="text"
                    value={selectedWallThickness}
                  />
                </label>
                <Button onClick={deleteSelectedWall} type="button" variant="outline">
                  Удалить стену
                </Button>
              </section>
            ) : null
          }
          wallObjects={roomWallObjects}
          walls={roomWalls}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          confirmLabel="Удалить"
          description="Объект будет удален из списка. Это действие нельзя отменить."
          onCancel={() => setDeleteId(null)}
          onConfirm={confirmDeleteVariable}
          title="Удалить объект?"
        />
      )}

      {roomDeleteId && (
        <ConfirmDialog
          confirmLabel="Удалить"
          description="Комната будет удалена из списка. Это действие нельзя отменить."
          onCancel={() => setRoomDeleteId(null)}
          onConfirm={confirmDeleteRoom}
          title="Удалить комнату?"
        />
      )}
    </div>
  );
}
