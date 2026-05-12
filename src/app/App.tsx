import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { DragEvent, KeyboardEvent, MouseEvent, WheelEvent } from "react";
import { RotateCw } from "lucide-react";
import {
  createId,
  distanceBetween,
  formatLength,
  parseLength,
  projectPointToWall,
  ObjectTypeIcon,
  orderConnectedWalls,
  RoomIcon,
  roomAreaFromWalls,
  unitConfig,
  wallLength,
  wallPointAt,
  usePlannerStore,
  useUndo,
  useRedo,
  type LengthUnit,
  type ObjectParameterKey,
  type ObjectTypeId,
  type ObjectVariable,
  type Room,
  type RoomBoundaryPoint,
  type RoomIconName,
  type RoomLayout,
  type RoomWall,
  type RoomWallObject,
  type WallMeasureInterval,
} from "@/entities/project";
import { createObjectVariable } from "@/entities/project/lib/object-service";
import { validateWalls, validateRoomName, validateNoIntersections } from "@/entities/project/lib/validators";
import { ObjectVariableDialog } from "@/features/object-variable-editor";
import { RoomBoard } from "@/features/room-board";
import { RoomEditorDialog } from "@/features/room-editor";
import { SettingsDialog } from "@/features/settings-panel";
import { Button, ConfirmDialog, UndoRedoControls } from "@/shared/ui";
import { useKeyboardShortcuts } from "@/shared/lib/use-keyboard-shortcuts";
import {
  CanvasSurface,
  WorkspaceNavigation,
  ZoomControls,
  type WorkspacePanel,
  type WorkspaceTool,
} from "@/widgets/planner-workspace";
import { ObjectListPanel, RoomListPanel } from "@/widgets/workspace-panel";

const MIN_CANVAS_SCALE = 0.35;
const MIN_ROOM_CANVAS_SCALE = 0.1;
const MAX_CANVAS_SCALE = 2.5;
const WHEEL_ZOOM_SENSITIVITY = 0.0012;
const ROOM_BOARD_WIDTH = 960;
const ROOM_BOARD_HEIGHT = 560;
const DEFAULT_ROOM_CANVAS_SCALE = 0.25;
const ROOM_DOOR_SNAP_DISTANCE = 80;
const ROOM_CONNECTION_DISTANCE = 8;
const DEFAULT_ROOM_COLOR = "#2f6f63";
const ROOM_COLORS = [
  "#2f6f63",
  "#3b82f6",
  "#0ea5e9",
  "#06b6d4",
  "#14b8a6",
  "#10b981",
  "#22c55e",
  "#84cc16",
  "#a3e635",
  "#eab308",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#dc2626",
  "#f43f5e",
  "#e11d48",
  "#ec4899",
  "#d946ef",
  "#a855f7",
  "#8b5cf6",
  "#6366f1",
  "#4f46e5",
  "#64748b",
  "#475569",
  "#334155",
  "#78716c",
  "#57534e",
  "#7c2d12",
  "#92400e",
  "#854d0e",
  "#365314",
  "#166534",
  "#065f46",
  "#115e59",
  "#155e75",
  "#1e40af",
  "#3730a3",
  "#581c87",
  "#831843",
  "#991b1b",
];

type RoomLayoutHistoryState = Array<{ roomId: string; layout?: RoomLayout; layouts?: RoomLayout[] }>;

const formatArea = (area: number) => Math.round(area * 100) / 100;

export function App() {
  const [activePanel, setActivePanel] = useState<WorkspacePanel | null>("objects");
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; originX: number; originY: number } | null>(
    null,
  );
  const snapshot = usePlannerStore((state) => state.present);
  const setSnapshot = usePlannerStore((state) => state.setSnapshot);
  const resetSnapshot = usePlannerStore((state) => state.resetSnapshot);
  const undo = useUndo();
  const redo = useRedo();
  const lengthUnit = snapshot.settings.lengthUnit;
  const selectedLengthUnit = unitConfig(lengthUnit);
  const defaultType = snapshot.objectTypes[0]?.id ?? "door";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<ObjectTypeId>(defaultType);
  const [name, setName] = useState("");
  const [parameterValues, setParameterValues] = useState<Partial<Record<ObjectParameterKey, string>>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [roomBoardOpen, setRoomBoardOpen] = useState(false);
  const [roomBoardEditingId, setRoomBoardEditingId] = useState<string | null>(null);
  const [roomWalls, setRoomWalls] = useState<RoomWall[]>([]);
  const [roomWallObjects, setRoomWallObjects] = useState<RoomWallObject[]>([]);
  const [roomDraftStart, setRoomDraftStart] = useState<RoomBoundaryPoint | null>(null);
  const [roomPreviewPoint, setRoomPreviewPoint] = useState<RoomBoundaryPoint | null>(null);
  const [roomCanvasOffset, setRoomCanvasOffset] = useState({ x: 0, y: 0 });
  const [roomCanvasScale, setRoomCanvasScale] = useState(DEFAULT_ROOM_CANVAS_SCALE);
  const [roomDragStart, setRoomDragStart] = useState<{
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [roomEndpointDrag, setRoomEndpointDrag] = useState<{
    wallId: string;
    endpoint: "start" | "end";
    originPoint: RoomBoundaryPoint;
  } | null>(null);
  const [roomPendingJoin, setRoomPendingJoin] = useState<{
    sourceWallId: string;
    endpoint: "start" | "end";
    targetWallId: string;
    point: RoomBoundaryPoint;
  } | null>(null);
  const [roomObjectPreview, setRoomObjectPreview] = useState<{
    objectVariableId: string;
    wallId: string;
    position: number;
  } | null>(null);
  const [roomDraggedObjectVariableId, setRoomDraggedObjectVariableId] = useState<string | null>(null);
  const [roomObjectDrag, setRoomObjectDrag] = useState<{
    wallObjectId: string;
    snapshot: { walls: RoomWall[]; wallObjects: RoomWallObject[] };
  } | null>(null);
  const [roomHistoryPast, setRoomHistoryPast] = useState<
    Array<{ walls: RoomWall[]; wallObjects: RoomWallObject[] }>
  >([]);
  const [roomHistoryFuture, setRoomHistoryFuture] = useState<
    Array<{ walls: RoomWall[]; wallObjects: RoomWallObject[] }>
  >([]);
  const [roomError, setRoomError] = useState("");
  const [roomModeTool, setRoomModeTool] = useState<WorkspaceTool>("rooms");
  const [roomActivePanel, setRoomActivePanel] = useState<WorkspacePanel | null>("roomDetails");
  const [selectedRoomWallId, setSelectedRoomWallId] = useState<string | null>(null);
  const [selectedRoomWallObjectId, setSelectedRoomWallObjectId] = useState<string | null>(null);
  const [selectedWallLength, setSelectedWallLength] = useState("");
  const [selectedWallThickness, setSelectedWallThickness] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomIcon, setNewRoomIcon] = useState<RoomIconName>("living");
  const [newRoomColor, setNewRoomColor] = useState(DEFAULT_ROOM_COLOR);
  const [newRoomDuplicateCount, setNewRoomDuplicateCount] = useState(1);
  const [newRoomWallMeasureInterval, setNewRoomWallMeasureInterval] = useState<WallMeasureInterval>(5);
  const [newRoomDefaultWallThickness, setNewRoomDefaultWallThickness] = useState(120);
  const [newRoomDefaultWallThicknessInput, setNewRoomDefaultWallThicknessInput] = useState("");
  const [roomExitConfirmOpen, setRoomExitConfirmOpen] = useState(false);
  const [roomEditingId, setRoomEditingId] = useState<string | null>(null);
  const [roomDeleteId, setRoomDeleteId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomArea, setRoomArea] = useState("");
  const [roomFormError, setRoomFormError] = useState("");
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);
  const [roomPlacementPreview, setRoomPlacementPreview] = useState<{
    roomId: string;
    layout: RoomLayout;
    snapped: boolean;
    valid: boolean;
  } | null>(null);
  const [roomLayoutDrag, setRoomLayoutDrag] = useState<{
    roomId: string;
    layoutIndex: number;
    originLayout: RoomLayout;
    originPoint: RoomBoundaryPoint;
    snapshot: RoomLayoutHistoryState;
    changed: boolean;
  } | null>(null);
  const [selectedRoomLayout, setSelectedRoomLayout] = useState<{ roomId: string; layoutIndex: number } | null>(null);
  const [roomLayoutRemoveError, setRoomLayoutRemoveError] = useState("");
  const [layoutHistoryPast, setLayoutHistoryPast] = useState<RoomLayoutHistoryState[]>([]);
  const [layoutHistoryFuture, setLayoutHistoryFuture] = useState<RoomLayoutHistoryState[]>([]);
  const previousLengthUnit = useRef(lengthUnit);
  const roomEndpointDragSnapshot = useRef<{ walls: RoomWall[]; wallObjects: RoomWallObject[] } | null>(null);
  const roomFieldEditSnapshot = useRef<{ walls: RoomWall[]; wallObjects: RoomWallObject[] } | null>(null);

  const selectedType = useMemo(
    () => snapshot.objectTypes.find((type) => type.id === typeId) ?? snapshot.objectTypes[0],
    [snapshot.objectTypes, typeId],
  );

  const selectedRoomWall = useMemo(
    () => roomWalls.find((wall) => wall.id === selectedRoomWallId) ?? null,
    [roomWalls, selectedRoomWallId],
  );

  const selectedRoomWallObject = useMemo(
    () => roomWallObjects.find((wallObject) => wallObject.id === selectedRoomWallObjectId) ?? null,
    [roomWallObjects, selectedRoomWallObjectId],
  );

  const selectedRoomWallObjectVariable = useMemo(
    () =>
      selectedRoomWallObject
        ? snapshot.objectVariables.find((object) => object.id === selectedRoomWallObject.objectVariableId) ?? null
        : null,
    [selectedRoomWallObject, snapshot.objectVariables],
  );

  const lockedObjectVariableIds = useMemo(() => {
    const ids = new Set<string>();

    for (const room of snapshot.project.rooms) {
      for (const wallObject of room.wallObjects ?? []) {
        ids.add(wallObject.objectVariableId);
      }
    }

    if (roomBoardOpen) {
      for (const wallObject of roomWallObjects) {
        ids.add(wallObject.objectVariableId);
      }
    }

    return ids;
  }, [roomBoardOpen, roomWallObjects, snapshot.project.rooms]);

  const currentLayoutHistoryState = (): RoomLayoutHistoryState =>
    snapshot.project.rooms.map((room) => ({
      roomId: room.id,
      layout: room.layout,
      layouts: room.layouts,
    }));

  const applyLayoutHistoryState = (state: RoomLayoutHistoryState) => {
    const stateByRoomId = new Map(state.map((item) => [item.roomId, item]));

    setSnapshot({
      ...snapshot,
      project: {
        ...snapshot.project,
        rooms: snapshot.project.rooms.map((room) => {
          const saved = stateByRoomId.get(room.id);

          if (!saved) {
            return {
              ...room,
              layout: undefined,
              layouts: undefined,
            };
          }

          return {
            ...room,
            layout: saved.layout,
            layouts: saved.layouts,
          };
        }),
      },
    });
    setSelectedRoomLayout(null);
    setRoomPlacementPreview(null);
    setRoomLayoutDrag(null);
    setRoomLayoutRemoveError("");
  };

  const pushLayoutHistory = (state = currentLayoutHistoryState()) => {
    setLayoutHistoryPast((past) => [...past, state]);
    setLayoutHistoryFuture([]);
  };

  const undoLayoutAction = () => {
    const previous = layoutHistoryPast[layoutHistoryPast.length - 1];

    if (!previous) {
      return;
    }

    setLayoutHistoryPast((past) => past.slice(0, -1));
    setLayoutHistoryFuture((future) => [currentLayoutHistoryState(), ...future]);
    applyLayoutHistoryState(previous);
  };

  const redoLayoutAction = () => {
    const next = layoutHistoryFuture[0];

    if (!next) {
      return;
    }

    setLayoutHistoryFuture((future) => future.slice(1));
    setLayoutHistoryPast((past) => [...past, currentLayoutHistoryState()]);
    applyLayoutHistoryState(next);
  };

  const currentRoomHistoryState = () => ({
    walls: roomWalls,
    wallObjects: roomWallObjects,
  });

  const resetRoomHistory = () => {
    setRoomHistoryPast([]);
    setRoomHistoryFuture([]);
    roomEndpointDragSnapshot.current = null;
    roomFieldEditSnapshot.current = null;
  };

  const pushRoomHistory = (state = currentRoomHistoryState()) => {
    setRoomHistoryPast((past) => [...past, state]);
    setRoomHistoryFuture([]);
  };

  const undoRoomAction = () => {
    const previous = roomHistoryPast[roomHistoryPast.length - 1];

    if (!previous) {
      return;
    }

    setRoomHistoryPast((past) => past.slice(0, -1));
    setRoomHistoryFuture((future) => [currentRoomHistoryState(), ...future]);
    setRoomWalls(previous.walls);
    setRoomWallObjects(previous.wallObjects);
    setSelectedRoomWallId((wallId) =>
      wallId && previous.walls.some((wall) => wall.id === wallId) ? wallId : null,
    );
    setRoomPendingJoin(null);
    setRoomObjectPreview(null);
    setRoomObjectDrag(null);
    setRoomEndpointDrag(null);
    setRoomDragStart(null);
    setSelectedRoomWallObjectId((wallObjectId) =>
      wallObjectId && previous.wallObjects.some((wallObject) => wallObject.id === wallObjectId) ? wallObjectId : null,
    );
    roomEndpointDragSnapshot.current = null;
    roomFieldEditSnapshot.current = null;
    setRoomError("");
  };

  const redoRoomAction = () => {
    const next = roomHistoryFuture[0];

    if (!next) {
      return;
    }

    setRoomHistoryFuture((future) => future.slice(1));
    setRoomHistoryPast((past) => [...past, currentRoomHistoryState()]);
    setRoomWalls(next.walls);
    setRoomWallObjects(next.wallObjects);
    setSelectedRoomWallId((wallId) => (wallId && next.walls.some((wall) => wall.id === wallId) ? wallId : null));
    setRoomPendingJoin(null);
    setRoomObjectPreview(null);
    setRoomObjectDrag(null);
    setRoomEndpointDrag(null);
    setRoomDragStart(null);
    setSelectedRoomWallObjectId((wallObjectId) =>
      wallObjectId && next.wallObjects.some((wallObject) => wallObject.id === wallObjectId) ? wallObjectId : null,
    );
    roomEndpointDragSnapshot.current = null;
    roomFieldEditSnapshot.current = null;
    setRoomError("");
  };

  const beginRoomFieldEdit = () => {
    if (roomFieldEditSnapshot.current) {
      return;
    }

    const previous = currentRoomHistoryState();
    pushRoomHistory(previous);
    roomFieldEditSnapshot.current = previous;
  };

  const commitRoomFieldEdit = () => {
    roomFieldEditSnapshot.current = null;
  };

  const wallSnapStep = useCallback(() => {
    return Math.max(1, newRoomWallMeasureInterval * selectedLengthUnit.multiplier);
  }, [newRoomWallMeasureInterval, selectedLengthUnit.multiplier]);

  const wallEndpoints = useMemo(() => {
    return roomWalls.flatMap((wall) => [
      { point: wall.start },
      { point: wall.end },
    ]);
  }, [roomWalls]);

  const areRoomWallsClosed = (walls: RoomWall[]) => {
    if (walls.length < 3) {
      return false;
    }

    const endpointKey = (point: RoomBoundaryPoint) => `${Math.round(point.x)}:${Math.round(point.y)}`;
    const endpointCounts = new Map<string, number>();

    for (const wall of walls) {
      endpointCounts.set(endpointKey(wall.start), (endpointCounts.get(endpointKey(wall.start)) ?? 0) + 1);
      endpointCounts.set(endpointKey(wall.end), (endpointCounts.get(endpointKey(wall.end)) ?? 0) + 1);
    }

    return Array.from(endpointCounts.values()).every((count) => count === 2);
  };

  const hasDoorObject = (wallObjects: RoomWallObject[]) => {
    return wallObjects.some((wallObject) => {
      const object = snapshot.objectVariables.find((item) => item.id === wallObject.objectVariableId);
      return object?.typeId === "door";
    });
  };

  const objectWidth = (objectVariableId: string) => {
    const object = snapshot.objectVariables.find((item) => item.id === objectVariableId);
    return object?.parameters.width ?? 0;
  };

  const clampWallObjectPosition = (wall: RoomWall, objectVariableId: string, position: number) => {
    const length = wallLength(wall);
    const width = objectWidth(objectVariableId);

    if (!length || !width) {
      return Math.min(1, Math.max(0, position));
    }

    const halfWidth = Math.min(0.45, width / 2 / length);
    return Math.min(1 - halfWidth, Math.max(halfWidth, position));
  };

  const snapWallObjectPosition = (wall: RoomWall, objectVariableId: string, position: number) => {
    const length = wallLength(wall);

    if (!length) {
      return 0;
    }

    const stepPosition = wallSnapStep() / length;
    const snappedPosition = Math.round(position / stepPosition) * stepPosition;
    return clampWallObjectPosition(wall, objectVariableId, snappedPosition);
  };

  const roomWallsForLayout = (room: Room) => {
    return (
      room.walls ??
      room.boundary?.map((point, index, points) => ({
        id: `${room.id}-wall-${index}`,
        start: point,
        end: points[(index + 1) % points.length],
        thickness: room.defaultWallThickness ?? snapshot.settings.defaultWallThickness,
      })) ??
      []
    );
  };

  const roomBounds = (room: Room) => {
    const points = roomWallsForLayout(room).flatMap((wall) => [wall.start, wall.end]);

    if (points.length === 0) {
      return { minX: 0, minY: 0, width: 180, height: 140 };
    }

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);

    return {
      minX,
      minY,
      width: Math.max(120, Math.max(...xs) - minX),
      height: Math.max(100, Math.max(...ys) - minY),
    };
  };

  const roomColor = (room: Room) => room.color ?? DEFAULT_ROOM_COLOR;

  const colorWithAlpha = (color: string, alpha: string) => {
    if (/^#[0-9a-f]{6}$/i.test(color)) {
      return `${color}${alpha}`;
    }

    return color;
  };

  const placedRoomLayouts = (room: Room) => room.layouts ?? (room.layout ? [room.layout] : []);

  const placedRoomCount = (room: Room) => placedRoomLayouts(room).length;

  const roomPlacementLimit = (room: Room) => Math.max(1, room.duplicateCount ?? 1);

  const remainingRoomCount = (room: Room) => Math.max(0, roomPlacementLimit(room) - placedRoomCount(room));

  const currentRoomArea = formatArea(roomAreaFromWalls(roomWalls));

  const roomCalculatedArea = (room: Room) => {
    const area = roomAreaFromWalls(roomWallsForLayout(room));

    return area > 0 ? area : room.area;
  };

  const apartmentArea = formatArea(
    snapshot.project.rooms.reduce((total, room) => total + roomCalculatedArea(room) * placedRoomCount(room), 0),
  );

  const totalPlacedRooms = () =>
    snapshot.project.rooms.reduce((total, room) => total + placedRoomCount(room), 0);

  const placedRoomNodes = (rooms = snapshot.project.rooms) =>
    rooms.flatMap((room) =>
      placedRoomLayouts(room).map((layout, layoutIndex) => ({
        id: `${room.id}:${layoutIndex}`,
        room,
        layout,
        layoutIndex,
      })),
    );

  const rotatePoint = (point: RoomBoundaryPoint, center: RoomBoundaryPoint, rotation = 0) => {
    const angle = (rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  };

  const roomPointToLayout = (room: Room, layout: RoomLayout, point: RoomBoundaryPoint) => {
    const bounds = roomBounds(room);
    const center = { x: bounds.width / 2, y: bounds.height / 2 };
    const localPoint = {
      x: point.x - bounds.minX,
      y: point.y - bounds.minY,
    };
    const rotatedPoint = rotatePoint(localPoint, center, layout.rotation);

    return {
      x: layout.x + rotatedPoint.x,
      y: layout.y + rotatedPoint.y,
    };
  };

  const roomDoorPoints = (room: Room, layout: RoomLayout) => {
    const walls = roomWallsForLayout(room);

    return (room.wallObjects ?? [])
      .filter((wallObject) => {
        const object = snapshot.objectVariables.find((item) => item.id === wallObject.objectVariableId);
        return object?.typeId === "door";
      })
      .map((wallObject) => {
        const wall = walls.find((item) => item.id === wallObject.wallId);

        if (!wall) {
          return null;
        }

        const point = wallPointAt(wall, wallObject.position);
        return roomPointToLayout(room, layout, point);
      })
      .filter((point): point is RoomBoundaryPoint => Boolean(point));
  };

  const areLayoutsConnected = (rooms = snapshot.project.rooms) => {
    const nodes = placedRoomNodes(rooms);

    if (nodes.length <= 1) {
      return true;
    }

    const visited = new Set<string>([nodes[0].id]);
    const queue = [nodes[0]];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      const currentDoors = roomDoorPoints(current.room, current.layout);

      for (const node of nodes) {
        if (visited.has(node.id)) {
          continue;
        }

        const isConnected = currentDoors.some((currentDoor) =>
          roomDoorPoints(node.room, node.layout).some(
            (door) => distanceBetween(currentDoor, door) <= ROOM_CONNECTION_DISTANCE,
          ),
        );

        if (isConnected) {
          visited.add(node.id);
          queue.push(node);
        }
      }
    }

    return visited.size === nodes.length;
  };

  const canvasPointFromClient = (clientX: number, clientY: number, surface: HTMLDivElement) => {
    const bounds = surface.getBoundingClientRect();
    const plane = surface.querySelector<HTMLDivElement>(".canvas-plane");
    const planeOrigin = {
      x: plane?.offsetLeft ?? 0,
      y: plane?.offsetTop ?? 0,
    };

    return {
      x: (clientX - bounds.left - planeOrigin.x - canvasOffset.x) / canvasScale,
      y: (clientY - bounds.top - planeOrigin.y - canvasOffset.y) / canvasScale,
    };
  };

  const layoutRoomAtPoint = (
    room: Room,
    point: RoomBoundaryPoint,
    options: { ignoredRoomId?: string; ignoredLayoutIndex?: number; rotation?: number } = {},
  ): { layout: RoomLayout; snapped: boolean; valid: boolean } => {
    const bounds = roomBounds(room);
    const freeLayout = {
      x: point.x - bounds.width / 2,
      y: point.y - bounds.height / 2,
      rotation: options.rotation ?? 0,
    };
    let bestSnap: { layout: RoomLayout; distance: number } | null = null;

    for (const placedRoom of snapshot.project.rooms) {
      for (const [layoutIndex, placedLayout] of placedRoomLayouts(placedRoom).entries()) {
        if (placedRoom.id === options.ignoredRoomId && layoutIndex === options.ignoredLayoutIndex) {
          continue;
        }

        const placedDoors = roomDoorPoints(placedRoom, placedLayout);
        const draggedDoors = roomDoorPoints(room, freeLayout);

        for (const placedDoor of placedDoors) {
          for (const draggedDoor of draggedDoors) {
            const distance = distanceBetween(placedDoor, draggedDoor);

            if (distance <= ROOM_DOOR_SNAP_DISTANCE && (!bestSnap || distance < bestSnap.distance)) {
              bestSnap = {
                distance,
                layout: {
                  ...freeLayout,
                  x: freeLayout.x + placedDoor.x - draggedDoor.x,
                  y: freeLayout.y + placedDoor.y - draggedDoor.y,
                },
              };
            }
          }
        }
      }
    }

    const hasOtherRooms = totalPlacedRooms() > (options.ignoredRoomId ? 1 : 0);
    return bestSnap
      ? { layout: bestSnap.layout, snapped: true, valid: true }
      : { layout: freeLayout, snapped: false, valid: !hasOtherRooms };
  };

  useKeyboardShortcuts({
    "ctrl+z": () => {
      if (roomBoardOpen) {
        undoRoomAction();
        return;
      }

      if (layoutHistoryPast.length > 0) {
        undoLayoutAction();
        return;
      }

      undo();
    },
    "ctrl+y": () => {
      if (roomBoardOpen) {
        redoRoomAction();
        return;
      }

      if (layoutHistoryFuture.length > 0) {
        redoLayoutAction();
        return;
      }

      redo();
    },
    "delete": () => {
      if (selectedRoomWallObjectId && roomBoardOpen) {
        deleteSelectedWallObject();
      } else if (selectedRoomWallId && roomBoardOpen) {
        deleteSelectedWall();
      } else if (deleteId) {
        confirmDeleteVariable();
      }
    },
    "escape": () => {
      if (roomBoardOpen && roomDraftStart) {
        setRoomDraftStart(null);
        setRoomPreviewPoint(null);
      } else if (formOpen) {
        closeVariableForm();
      }
    },
  });

  const clampCanvasScale = (nextScale: number) => {
    return Math.min(MAX_CANVAS_SCALE, Math.max(MIN_CANVAS_SCALE, nextScale));
  };

  const clampRoomCanvasScale = (nextScale: number) => {
    return Math.min(MAX_CANVAS_SCALE, Math.max(MIN_ROOM_CANVAS_SCALE, nextScale));
  };

  const setZoom = (nextScale: number) => {
    setCanvasScale(clampCanvasScale(nextScale));
  };

  const setRoomZoom = (nextScale: number) => {
    setRoomCanvasScale(clampRoomCanvasScale(nextScale));
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
    if (lockedObjectVariableIds.has(variable.id)) {
      return;
    }

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

    if (lockedObjectVariableIds.has(deleteId)) {
      setDeleteId(null);
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

  const clearAll = () => {
    resetSnapshot();
    setClearAllConfirmOpen(false);
    setSettingsOpen(false);
    setActivePanel("objects");
    setSelectedRoomLayout(null);
    setRoomPlacementPreview(null);
    setRoomLayoutDrag(null);
    setLayoutHistoryPast([]);
    setLayoutHistoryFuture([]);
    closeVariableForm();
    closeRoomEditor();
    setDeleteId(null);
    setRoomDeleteId(null);

    if (roomBoardOpen) {
      closeRoomBoard();
    }
  };

  const editRoom = (room: Room) => {
    if (placedRoomCount(room) > 0) {
      return;
    }

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
    setRoomCanvasScale(DEFAULT_ROOM_CANVAS_SCALE);
    setRoomDragStart(null);
    setRoomEndpointDrag(null);
    setRoomPendingJoin(null);
    setRoomObjectPreview(null);
    setRoomDraggedObjectVariableId(null);
    setRoomObjectDrag(null);
    resetRoomHistory();
    setSelectedRoomWallId(null);
    setSelectedRoomWallObjectId(null);
    setNewRoomName(room.name);
    setNewRoomIcon(room.icon ?? "living");
    setNewRoomColor(room.color ?? DEFAULT_ROOM_COLOR);
    setNewRoomDuplicateCount(room.duplicateCount ?? 1);
    setNewRoomWallMeasureInterval(room.wallMeasureInterval ?? 5);
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

    const parameters: Partial<Record<ObjectParameterKey, number>> = {};

    for (const parameter of selectedType.parameters) {
      const parsed = parseLength(parameterValues[parameter.key] ?? "", lengthUnit);

      if (!parsed) {
        setFormError(`Заполните параметр "${parameter.label}" положительным числом.`);
        return;
      }

      parameters[parameter.key] = parsed;
    }

    const result = createObjectVariable(
      createId("object"),
      typeId,
      name,
      parameters,
      snapshot.objectVariables,
      editingId ?? undefined,
    );

    if (!result.success) {
      setFormError(result.error.message);
      return;
    }

    setSnapshot({
      ...snapshot,
      objectVariables: editingId
        ? snapshot.objectVariables.map((variable) =>
            variable.id === editingId ? result.value : variable,
          )
        : [...snapshot.objectVariables, result.value],
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

    if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains("canvas-grid")) {
      setSelectedRoomLayout(null);
      setRoomLayoutRemoveError("");
    }

    setDragStart({
      x: event.clientX,
      y: event.clientY,
      originX: canvasOffset.x,
      originY: canvasOffset.y,
    });
  };

  const moveCanvas = (event: MouseEvent<HTMLDivElement>) => {
    if (roomLayoutDrag) {
      const point = canvasPointFromClient(event.clientX, event.clientY, event.currentTarget);
      const room = snapshot.project.rooms.find((item) => item.id === roomLayoutDrag.roomId);

      if (!room) {
        return;
      }

      const targetPoint = {
        x: roomLayoutDrag.originLayout.x + point.x - roomLayoutDrag.originPoint.x + roomBounds(room).width / 2,
        y: roomLayoutDrag.originLayout.y + point.y - roomLayoutDrag.originPoint.y + roomBounds(room).height / 2,
      };
      const placement = layoutRoomAtPoint(room, targetPoint, {
        ignoredRoomId: roomLayoutDrag.roomId,
        ignoredLayoutIndex: roomLayoutDrag.layoutIndex,
        rotation: roomLayoutDrag.originLayout.rotation,
      });

      if (placement.valid) {
        setSnapshot({
          ...snapshot,
          project: {
            ...snapshot.project,
            rooms: snapshot.project.rooms.map((item) => {
              if (item.id !== room.id) {
                return item;
              }

              const layouts = placedRoomLayouts(item).map((layout, index) =>
                index === roomLayoutDrag.layoutIndex ? placement.layout : layout,
              );
              return { ...item, layout: layouts[0], layouts };
            }),
          },
        });
        setRoomLayoutDrag((drag) => (drag ? { ...drag, changed: true } : drag));
      }
      setRoomPlacementPreview({
        roomId: room.id,
        layout: placement.layout,
        snapped: placement.snapped,
        valid: placement.valid,
      });
      return;
    }

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

    const bounds = event.currentTarget.getBoundingClientRect();
    const cursor = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const plane = event.currentTarget.querySelector<HTMLDivElement>(".canvas-plane");
    const planeOrigin = {
      x: plane?.offsetLeft ?? 0,
      y: plane?.offsetTop ?? 0,
    };
    const nextScale = clampCanvasScale(canvasScale * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY));
    const planePoint = {
      x: (cursor.x - planeOrigin.x - canvasOffset.x) / canvasScale,
      y: (cursor.y - planeOrigin.y - canvasOffset.y) / canvasScale,
    };

    setCanvasOffset({
      x: cursor.x - planeOrigin.x - planePoint.x * nextScale,
      y: cursor.y - planeOrigin.y - planePoint.y * nextScale,
    });
    setCanvasScale(nextScale);
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
    setRoomCanvasScale(DEFAULT_ROOM_CANVAS_SCALE);
    setRoomDragStart(null);
    setRoomEndpointDrag(null);
    setRoomPendingJoin(null);
    setRoomObjectPreview(null);
    setRoomDraggedObjectVariableId(null);
    setRoomObjectDrag(null);
    resetRoomHistory();
    setSelectedRoomWallId(null);
    setSelectedRoomWallObjectId(null);
    setNewRoomName(`Комната ${nextNumber}`);
    setNewRoomIcon("living");
    setNewRoomColor(DEFAULT_ROOM_COLOR);
    setNewRoomDuplicateCount(1);
    setNewRoomWallMeasureInterval(5);
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
    setRoomEndpointDrag(null);
    setRoomPendingJoin(null);
    setRoomObjectPreview(null);
    setRoomDraggedObjectVariableId(null);
    setRoomObjectDrag(null);
    resetRoomHistory();
    setSelectedRoomWallId(null);
    setNewRoomName("");
    setNewRoomIcon("living");
    setNewRoomColor(DEFAULT_ROOM_COLOR);
    setNewRoomDuplicateCount(1);
    setNewRoomWallMeasureInterval(5);
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

  const snapBoardPoint = useCallback((point: RoomBoundaryPoint): RoomBoundaryPoint => {
    const step = wallSnapStep();

    return {
      x: Math.round(point.x / step) * step,
      y: Math.round(point.y / step) * step,
    };
  }, [wallSnapStep]);

  const findNearestWallEndpoint = useCallback((point: RoomBoundaryPoint) => {
    const endpoints = wallEndpoints;

    return endpoints.find((endpoint) => distanceBetween(endpoint.point, point) <= 14)?.point ?? null;
  }, [wallEndpoints]);

  const findNearestWallSnap = useCallback((point: RoomBoundaryPoint, ignoredWallIds: string[] = []) => {
    const ignored = new Set(ignoredWallIds);

    for (const wall of roomWalls) {
      if (ignored.has(wall.id)) {
        continue;
      }

      if (distanceBetween(wall.start, point) <= 14) {
        return { point: wall.start, wallId: wall.id, endpoint: "start" as const };
      }

      if (distanceBetween(wall.end, point) <= 14) {
        return { point: wall.end, wallId: wall.id, endpoint: "end" as const };
      }
    }

    let nearest:
      | {
          point: RoomBoundaryPoint;
          wallId: string;
          distance: number;
        }
      | null = null;

    for (const wall of roomWalls) {
      if (ignored.has(wall.id)) {
        continue;
      }

      const position = projectPointToWall(point, wall);

      if (position <= 0.02 || position >= 0.98) {
        continue;
      }

      const projected = wallPointAt(wall, position);
      const distance = distanceBetween(point, projected);

      if (distance <= 14 && (!nearest || distance < nearest.distance)) {
        nearest = { point: projected, wallId: wall.id, distance };
      }
    }

    return nearest ? { point: nearest.point, wallId: nearest.wallId, endpoint: null } : null;
  }, [roomWalls]);

  const constrainAndSnapWallEnd = useCallback((start: RoomBoundaryPoint, rawPoint: RoomBoundaryPoint) => {
    const dx = rawPoint.x - start.x;
    const dy = rawPoint.y - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!absX && !absY) {
      return start;
    }

    const step = wallSnapStep();
    const constrained = absX >= absY ? { x: rawPoint.x, y: start.y } : { x: start.x, y: rawPoint.y };
    const length = distanceBetween(start, constrained);
    const snappedLength = Math.max(step, Math.round(length / step) * step);
    const directionX = (constrained.x - start.x) / length;
    const directionY = (constrained.y - start.y) / length;

    return {
      x: start.x + directionX * snappedLength,
      y: start.y + directionY * snappedLength,
    };
  }, [wallSnapStep]);

  const getBoardPointFromClient = (clientX: number, clientY: number, bounds: DOMRect): RoomBoundaryPoint => {
    return {
      x: Math.round((((clientX - bounds.left) / bounds.width) * ROOM_BOARD_WIDTH - roomCanvasOffset.x) / roomCanvasScale),
      y: Math.round((((clientY - bounds.top) / bounds.height) * ROOM_BOARD_HEIGHT - roomCanvasOffset.y) / roomCanvasScale),
    };
  };

  const startRoomCanvasDrag = (event: MouseEvent<SVGSVGElement>) => {
    if (roomEndpointDrag || roomModeTool !== "cursor" || event.button !== 0) {
      return;
    }

    setRoomDragStart({
      x: event.clientX,
      y: event.clientY,
      originX: roomCanvasOffset.x,
      originY: roomCanvasOffset.y,
    });
  };

  const moveRoomWallEndpoint = (point: RoomBoundaryPoint) => {
    if (!roomEndpointDrag) {
      return;
    }

    const draggedWall = roomWalls.find((wall) => wall.id === roomEndpointDrag.wallId);

    if (!draggedWall) {
      return;
    }

    const fixedPoint = roomEndpointDrag.endpoint === "start" ? draggedWall.end : draggedWall.start;
    const snappedPoint = constrainAndSnapWallEnd(fixedPoint, point);
    const rawSnap = findNearestWallSnap(snappedPoint, [roomEndpointDrag.wallId]);
    const rawNextPoint = rawSnap?.point ?? snappedPoint;
    const attachedWalls = roomWalls
      .map((wall) => {
        const startAttached = distanceBetween(wall.start, roomEndpointDrag.originPoint) <= 2;
        const endAttached = distanceBetween(wall.end, roomEndpointDrag.originPoint) <= 2;

        return { wall, startAttached, endAttached };
      })
      .filter(({ startAttached, endAttached }) => startAttached || endAttached);
    const nextPoint = attachedWalls.reduce((alignedPoint, { wall, startAttached }) => {
      const otherPoint = startAttached ? wall.end : wall.start;
      const horizontal = Math.abs(wall.end.x - wall.start.x) >= Math.abs(wall.end.y - wall.start.y);

      return horizontal ? { ...alignedPoint, y: otherPoint.y } : { ...alignedPoint, x: otherPoint.x };
    }, rawNextPoint);
    const snap = rawSnap && distanceBetween(rawSnap.point, nextPoint) <= 2 ? rawSnap : null;
    const nextWalls = roomWalls.map((wall) => {
      const startAttached = distanceBetween(wall.start, roomEndpointDrag.originPoint) <= 2;
      const endAttached = distanceBetween(wall.end, roomEndpointDrag.originPoint) <= 2;

      if (!startAttached && !endAttached) {
        return wall;
      }

      return {
        ...wall,
        start: startAttached ? nextPoint : wall.start,
        end: endAttached ? nextPoint : wall.end,
      };
    });
    const intersectionResult = validateNoIntersections(nextWalls);

    if (roomEndpointDragSnapshot.current) {
      pushRoomHistory(roomEndpointDragSnapshot.current);
      roomEndpointDragSnapshot.current = null;
    }

    setRoomWalls(nextWalls);
    setRoomEndpointDrag((drag) => (drag ? { ...drag, originPoint: nextPoint } : drag));
    setRoomPendingJoin(
      snap && snap.endpoint === null
        ? {
            sourceWallId: roomEndpointDrag.wallId,
            endpoint: roomEndpointDrag.endpoint,
            targetWallId: snap.wallId,
            point: nextPoint,
          }
        : null,
    );
    setRoomError(intersectionResult.success ? "" : intersectionResult.error.message);
  };

  const startRoomWallEndpointDrag = (wallId: string, endpoint: "start" | "end") => {
    const wall = roomWalls.find((item) => item.id === wallId);

    if (!wall) {
      return;
    }

    setSelectedRoomWallId(wallId);
    setRoomModeTool("cursor");
    roomEndpointDragSnapshot.current = currentRoomHistoryState();
    setRoomEndpointDrag({
      wallId,
      endpoint,
      originPoint: wall[endpoint],
    });
    setRoomDragStart(null);
    setRoomError("");
  };

  const moveRoomCanvas = (event: MouseEvent<SVGSVGElement>) => {
    if (!roomDragStart) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - roomDragStart.x) / bounds.width) * ROOM_BOARD_WIDTH;
    const dy = ((event.clientY - roomDragStart.y) / bounds.height) * ROOM_BOARD_HEIGHT;

    setRoomCanvasOffset({
      x: roomDragStart.originX + dx,
      y: roomDragStart.originY + dy,
    });
  };

  const moveRoomBoardPointer = (event: MouseEvent<SVGSVGElement>) => {
    if (roomObjectDrag) {
      moveRoomWallObject(event);
      return;
    }

    if (roomEndpointDrag) {
      moveRoomWallEndpoint(getBoardPoint(event));
      return;
    }

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

    const bounds = event.currentTarget.getBoundingClientRect();
    const cursor = {
      x: ((event.clientX - bounds.left) / bounds.width) * ROOM_BOARD_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * ROOM_BOARD_HEIGHT,
    };
    const nextScale = clampRoomCanvasScale(roomCanvasScale * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY));
    const boardPoint = {
      x: (cursor.x - roomCanvasOffset.x) / roomCanvasScale,
      y: (cursor.y - roomCanvasOffset.y) / roomCanvasScale,
    };

    setRoomCanvasOffset({
      x: cursor.x - boardPoint.x * nextScale,
      y: cursor.y - boardPoint.y * nextScale,
    });
    setRoomCanvasScale(nextScale);
  };

  const previewWallObject = (objectVariableId: string, wallId: string, clientPoint: RoomBoundaryPoint) => {
    const wall = roomWalls.find((item) => item.id === wallId);
    const svg = document.querySelector<SVGSVGElement>(".room-drawing-board");

    if (!wall || !svg) {
      return;
    }

    const point = getBoardPointFromClient(clientPoint.x, clientPoint.y, svg.getBoundingClientRect());
    setRoomObjectPreview({
      objectVariableId,
      wallId,
      position: snapWallObjectPosition(wall, objectVariableId, projectPointToWall(point, wall)),
    });
  };

  const startMoveRoomWallObject = (wallObjectId: string) => {
    setRoomObjectDrag({
      wallObjectId,
      snapshot: currentRoomHistoryState(),
    });
    setRoomDragStart(null);
    setRoomEndpointDrag(null);
    setRoomObjectPreview(null);
    setRoomModeTool("cursor");
  };

  const moveRoomWallObject = (event: MouseEvent<SVGSVGElement>) => {
    if (!roomObjectDrag) {
      return;
    }

    const wallObject = roomWallObjects.find((item) => item.id === roomObjectDrag.wallObjectId);

    if (!wallObject) {
      return;
    }

    const rawPoint = getBoardPoint(event);
    let targetWall = roomWalls.find((wall) => wall.id === wallObject.wallId);
    let targetPosition = targetWall ? projectPointToWall(rawPoint, targetWall) : wallObject.position;
    let targetDistance = targetWall
      ? distanceBetween(rawPoint, wallPointAt(targetWall, targetPosition))
      : Number.POSITIVE_INFINITY;

    for (const wall of roomWalls) {
      const position = projectPointToWall(rawPoint, wall);
      const distance = distanceBetween(rawPoint, wallPointAt(wall, position));

      if (distance < targetDistance) {
        targetWall = wall;
        targetPosition = position;
        targetDistance = distance;
      }
    }

    if (!targetWall) {
      return;
    }

    const nextPosition = snapWallObjectPosition(targetWall, wallObject.objectVariableId, targetPosition);
    setRoomWallObjects((objects) =>
      objects.map((object) =>
        object.id === wallObject.id
          ? {
              ...object,
              wallId: targetWall.id,
              position: nextPosition,
            }
          : object,
      ),
    );
  };

  const finishMoveRoomWallObject = () => {
    if (!roomObjectDrag) {
      return;
    }

    pushRoomHistory(roomObjectDrag.snapshot);
    setRoomObjectDrag(null);
  };

  const saveRoomBoard = () => {
    const nameResult = validateRoomName(newRoomName);
    if (!nameResult.success) {
      setRoomError(nameResult.error.message);
      setRoomActivePanel("roomDetails");
      return;
    }

    const wallsResult = validateWalls(roomWalls);
    if (!wallsResult.success) {
      setRoomError(wallsResult.error.message);
      setRoomModeTool("rooms");
      return;
    }

    const intersectionResult = validateNoIntersections(roomWalls);
    if (!intersectionResult.success) {
      setRoomError(intersectionResult.error.message);
      setRoomModeTool("rooms");
      return;
    }

    if (!areRoomWallsClosed(roomWalls)) {
      setRoomError("Закройте контур комнаты без дырок перед сохранением.");
      setRoomModeTool("rooms");
      return;
    }

    const area = roomAreaFromWalls(roomWalls);
    if (area <= 0) {
      setRoomError("Контур комнаты должен быть цельным и замкнутым.");
      setRoomModeTool("rooms");
      return;
    }

    if (!hasDoorObject(roomWallObjects)) {
      setRoomError("Добавьте на стену хотя бы один объект типа \"Дверь\".");
      setRoomActivePanel("objects");
      return;
    }

    const roomPayload = {
      name: nameResult.value,
      area,
      icon: newRoomIcon,
      color: newRoomColor,
      duplicateCount: newRoomDuplicateCount,
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

    const snap = findNearestWallSnap(rawPoint);
    const nextPoint = snap?.point ?? constrainAndSnapWallEnd(roomDraftStart, rawPoint);

    if (distanceBetween(nextPoint, roomDraftStart) < 12) {
      setRoomError("Линия слишком короткая.");
      return;
    }

    const newWallId = createId("wall");
    const nextWalls = [
      ...roomWalls,
      {
        id: newWallId,
        start: roomDraftStart,
        end: nextPoint,
        thickness: newRoomDefaultWallThickness,
      },
    ];
    const intersectionResult = validateNoIntersections(nextWalls);

    pushRoomHistory();
    setRoomWalls(nextWalls);
    setRoomPendingJoin(
      snap && snap.endpoint === null
        ? {
            sourceWallId: newWallId,
            endpoint: "end",
            targetWallId: snap.wallId,
            point: nextPoint,
          }
        : null,
    );
    setSelectedRoomWallId(newWallId);
    setRoomError(intersectionResult.success ? "" : intersectionResult.error.message);
    setRoomDraftStart(null);
    setRoomPreviewPoint(null);
    setRoomModeTool("cursor");
  };

  const mergePendingWallJoin = () => {
    if (!roomPendingJoin) {
      return;
    }

    const targetWall = roomWalls.find((wall) => wall.id === roomPendingJoin.targetWallId);

    if (!targetWall) {
      setRoomPendingJoin(null);
      return;
    }

    const firstLength = distanceBetween(targetWall.start, roomPendingJoin.point);
    const secondLength = distanceBetween(roomPendingJoin.point, targetWall.end);

    if (firstLength < 100 || secondLength < 100) {
      setRoomError("Точка объединения слишком близко к краю стены.");
      return;
    }

    const splitPosition = projectPointToWall(roomPendingJoin.point, targetWall);
    const firstWallId = createId("wall");
    const secondWallId = createId("wall");
    const nextWalls = roomWalls.flatMap((wall) =>
      wall.id === targetWall.id
        ? [
            {
              ...wall,
              id: firstWallId,
              end: roomPendingJoin.point,
            },
            {
              ...wall,
              id: secondWallId,
              start: roomPendingJoin.point,
            },
          ]
        : [wall],
    );
    const intersectionResult = validateNoIntersections(nextWalls);

    if (!intersectionResult.success) {
      setRoomError(intersectionResult.error.message);
      return;
    }

    pushRoomHistory();
    setRoomWalls(nextWalls);
    setRoomWallObjects((objects) =>
      objects.map((object) => {
        if (object.wallId !== targetWall.id) {
          return object;
        }

        if (object.position <= splitPosition) {
          return {
            ...object,
            wallId: firstWallId,
            position: splitPosition > 0 ? object.position / splitPosition : 0,
          };
        }

        return {
          ...object,
          wallId: secondWallId,
          position: splitPosition < 1 ? (object.position - splitPosition) / (1 - splitPosition) : 1,
        };
      }),
    );
    setRoomPendingJoin(null);
    setRoomError("");
  };

  const previewRoomLine = (event: MouseEvent<SVGSVGElement>) => {
    if (!roomDraftStart) {
      setRoomPreviewPoint(null);
      return;
    }

    const rawPoint = getBoardPoint(event);
    setRoomPreviewPoint(findNearestWallSnap(rawPoint)?.point ?? constrainAndSnapWallEnd(roomDraftStart, rawPoint));
  };

  const startRoomWallFromEndpoint = (point: RoomBoundaryPoint) => {
    setRoomDraftStart(point);
    setRoomPreviewPoint(null);
    setRoomPendingJoin(null);
    setRoomModeTool("rooms");
    setRoomError("");
  };

  const selectRoomWall = (wallId: string) => {
    const wall = roomWalls.find((item) => item.id === wallId);

    setSelectedRoomWallId(wallId);
    setSelectedRoomWallObjectId(null);
    setRoomModeTool("cursor");

    if (wall) {
      setSelectedWallLength(formatLength(wallLength(wall), lengthUnit));
      setSelectedWallThickness(formatLength(wall.thickness, lengthUnit));
    }
  };

  const deselectRoomWall = () => {
    setSelectedRoomWallId(null);
    setSelectedRoomWallObjectId(null);
    setSelectedWallLength("");
    setSelectedWallThickness("");
  };

  const selectRoomWallObject = (wallObjectId: string) => {
    setSelectedRoomWallObjectId(wallObjectId);
    setSelectedRoomWallId(null);
    setSelectedWallLength("");
    setSelectedWallThickness("");
    setRoomModeTool("cursor");
  };

  const changeSelectedWallLength = (value: string) => {
    setSelectedWallLength(value);
  };

  const commitSelectedWallLength = () => {
    const parsed = parseLength(selectedWallLength, lengthUnit);

    if (!parsed || !selectedRoomWall) {
      commitRoomFieldEdit();
      if (selectedRoomWall) {
        setSelectedWallLength(formatLength(wallLength(selectedRoomWall), lengthUnit));
      }
      return;
    }

    const snappedParsed = Math.max(wallSnapStep(), Math.round(parsed / wallSnapStep()) * wallSnapStep());
    const currentLength = wallLength(selectedRoomWall);

    if (!currentLength) {
      commitRoomFieldEdit();
      return;
    }

    beginRoomFieldEdit();
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
    commitRoomFieldEdit();
    setSelectedWallLength(formatLength(snappedParsed, lengthUnit));
  };

  const resnapRoomWallsToStep = (interval: WallMeasureInterval) => {
    const step = Math.max(1, interval * selectedLengthUnit.multiplier);

    pushRoomHistory();
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

    beginRoomFieldEdit();
    setRoomWalls((walls) =>
      walls.map((wall) => (wall.id === selectedRoomWall.id ? { ...wall, thickness: parsed } : wall)),
    );
  };

  const commitSelectedWallThickness = () => {
    commitRoomFieldEdit();

    if (selectedRoomWall) {
      setSelectedWallThickness(formatLength(selectedRoomWall.thickness, lengthUnit));
    }
  };

  const commitWallFieldOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const deleteSelectedWall = () => {
    if (!selectedRoomWallId) {
      return;
    }

    pushRoomHistory();
    setRoomWalls((walls) => walls.filter((wall) => wall.id !== selectedRoomWallId));
    setRoomWallObjects((objects) => objects.filter((object) => object.wallId !== selectedRoomWallId));
    setSelectedRoomWallId(null);
    setSelectedRoomWallObjectId(null);
    setSelectedWallLength("");
    setSelectedWallThickness("");
    setRoomDraftStart(null);
    setRoomPreviewPoint(null);
    setRoomPendingJoin(null);
    setRoomError("");
  };

  const deleteSelectedWallObject = () => {
    if (!selectedRoomWallObjectId) {
      return;
    }

    pushRoomHistory();
    setRoomWallObjects((objects) => objects.filter((object) => object.id !== selectedRoomWallObjectId));
    setSelectedRoomWallObjectId(null);
    setRoomObjectDrag(null);
    setRoomObjectPreview(null);
    setRoomError("");
  };

  const addWallObject = (objectVariableId: string, wallId: string, clientPoint: RoomBoundaryPoint) => {
    const wall = roomWalls.find((item) => item.id === wallId);
    const svg = document.querySelector<SVGSVGElement>(".room-drawing-board");

    if (!wall || !svg) {
      return;
    }

    const point = getBoardPointFromClient(clientPoint.x, clientPoint.y, svg.getBoundingClientRect());
    const position = snapWallObjectPosition(wall, objectVariableId, projectPointToWall(point, wall));

    pushRoomHistory();
    setRoomWallObjects((objects) => [
      ...objects,
      {
        id: createId("wall-object"),
        objectVariableId,
        wallId,
        position,
        side: "inside",
        offset: 0,
      },
    ]);
    setRoomObjectPreview(null);
    setRoomDraggedObjectVariableId(null);
    setRoomError("");
  };

  const previewRoomPlacement = (event: DragEvent<HTMLDivElement>) => {
    const roomId = event.dataTransfer.getData("text/plain") || draggedRoomId;
    const room = snapshot.project.rooms.find((item) => item.id === roomId);

    if (!room || remainingRoomCount(room) <= 0) {
      return;
    }

    event.preventDefault();
    setRoomPlacementPreview({
      roomId: room.id,
      ...layoutRoomAtPoint(room, canvasPointFromClient(event.clientX, event.clientY, event.currentTarget)),
    });
  };

  const placeRoomOnCanvas = (event: DragEvent<HTMLDivElement>) => {
    const roomId = event.dataTransfer.getData("text/plain") || draggedRoomId;
    const room = snapshot.project.rooms.find((item) => item.id === roomId);

    if (!room || remainingRoomCount(room) <= 0) {
      setDraggedRoomId(null);
      setRoomPlacementPreview(null);
      return;
    }

    event.preventDefault();
    const placement = layoutRoomAtPoint(room, canvasPointFromClient(event.clientX, event.clientY, event.currentTarget));

    if (!placement.valid) {
      setRoomPlacementPreview({
        roomId: room.id,
        ...placement,
      });
      return;
    }

    pushLayoutHistory();
    setSnapshot({
      ...snapshot,
      project: {
        ...snapshot.project,
        rooms: snapshot.project.rooms.map((item) =>
          item.id === room.id
            ? (() => {
                const layouts = [...placedRoomLayouts(item), placement.layout];
                return { ...item, layout: layouts[0], layouts };
              })()
            : item,
        ),
      },
    });
    setDraggedRoomId(null);
    setRoomPlacementPreview(null);
  };

  const rotateRoomLayout = (roomId: string, layoutIndex: number, direction: -1 | 1) => {
    const room = snapshot.project.rooms.find((item) => item.id === roomId);

    if (!room) {
      return;
    }

    const currentLayout = placedRoomLayouts(room)[layoutIndex];

    if (!currentLayout) {
      return;
    }

    const rotatedLayout = {
      ...currentLayout,
      rotation: ((currentLayout.rotation ?? 0) + direction * 90 + 360) % 360,
    };
    const bounds = roomBounds(room);
    const placement = layoutRoomAtPoint(
      room,
      { x: currentLayout.x + bounds.width / 2, y: currentLayout.y + bounds.height / 2 },
      {
        ignoredRoomId: roomId,
        ignoredLayoutIndex: layoutIndex,
        rotation: rotatedLayout.rotation,
      },
    );

    if (!placement.valid) {
      setRoomPlacementPreview({ roomId, layout: rotatedLayout, snapped: false, valid: false });
      return;
    }

    pushLayoutHistory();
    setSnapshot({
      ...snapshot,
      project: {
        ...snapshot.project,
        rooms: snapshot.project.rooms.map((item) => {
          if (item.id !== roomId) {
            return item;
          }

          const layouts = placedRoomLayouts(item).map((layout, index) =>
            index === layoutIndex ? placement.layout : layout,
          );
          return { ...item, layout: layouts[0], layouts };
        }),
      },
    });
    setRoomPlacementPreview(null);
  };

  const removeSelectedRoomLayout = () => {
    if (!selectedRoomLayout) {
      return;
    }

    const nextRooms = snapshot.project.rooms.map((room) => {
      if (room.id !== selectedRoomLayout.roomId) {
        return room;
      }

      const layouts = placedRoomLayouts(room).filter((_, index) => index !== selectedRoomLayout.layoutIndex);
      return {
        ...room,
        layout: layouts[0],
        layouts,
      };
    });

    if (!areLayoutsConnected(nextRooms)) {
      setRoomLayoutRemoveError("Нельзя убрать комнату: оставшиеся комнаты потеряют соединение.");
      return;
    }

    pushLayoutHistory();
    setSnapshot({
      ...snapshot,
      project: {
        ...snapshot.project,
        rooms: nextRooms,
      },
    });
    setSelectedRoomLayout(null);
    setRoomLayoutRemoveError("");
  };

  const renderCanvasRoom = (
    room: Room,
    layout: RoomLayout,
    preview = false,
    snapped = false,
    valid = true,
    layoutIndex = 0,
  ) => {
    const walls = roomWallsForLayout(room);
    const orderedWalls = orderConnectedWalls(walls);
    const bounds = roomBounds(room);
    const wallObjects = room.wallObjects ?? [];
    const fillColor = roomColor(room);
    const polygonPoints = orderedWalls.map((wall) => `${wall.start.x - bounds.minX},${wall.start.y - bounds.minY}`).join(" ");
    const wallObjectRange = (wall: RoomWall, wallObject: RoomWallObject) => {
      const object = snapshot.objectVariables.find((item) => item.id === wallObject.objectVariableId);
      const length = wallLength(wall);
      const width = object?.parameters.width ?? 0;
      const half = length && width ? Math.min(0.45, width / 2 / length) : 0;

      return {
        start: Math.max(0, wallObject.position - half),
        end: Math.min(1, wallObject.position + half),
      };
    };
    const wallMeasureSegments = (wall: RoomWall) => {
      const currentGlobalWall = {
        start: roomPointToLayout(room, layout, wall.start),
        end: roomPointToLayout(room, layout, wall.end),
      };
      const junctionRanges = placedRoomNodes()
        .filter((node) => node.room.id !== room.id || node.layoutIndex !== layoutIndex)
        .flatMap((node) =>
          roomWallsForLayout(node.room).flatMap((otherWall) => [otherWall.start, otherWall.end].map((point) => ({
            node,
            point,
          }))),
        )
        .map(({ node, point }) => {
          const globalPoint = roomPointToLayout(node.room, node.layout, point);
          const position = projectPointToWall(globalPoint, currentGlobalWall);
          const projected = wallPointAt(currentGlobalWall, position);

          return {
            start: position,
            end: position,
            distance: distanceBetween(globalPoint, projected),
          };
        })
        .filter((range) => range.distance <= ROOM_CONNECTION_DISTANCE && range.start > 0.02 && range.start < 0.98);
      const ranges = wallObjects
        .filter((wallObject) => wallObject.wallId === wall.id)
        .map((wallObject) => wallObjectRange(wall, wallObject))
        .concat(junctionRanges.map(({ start, end }) => ({ start, end })))
        .sort((first, second) => first.start - second.start);
      const segments: Array<{ start: number; end: number; key: string }> = [];
      let cursor = 0;

      for (const [index, range] of ranges.entries()) {
        if (range.start > cursor) {
          segments.push({ start: cursor, end: range.start, key: `${wall.id}-segment-${index}` });
        }
        cursor = Math.max(cursor, range.end);
      }

      if (cursor < 1) {
        segments.push({ start: cursor, end: 1, key: `${wall.id}-segment-after` });
      }

      return segments;
    };
    const shouldShowWallSegmentMeasure = (wall: RoomWall, segmentStart: number, segmentEnd: number) => {
      const currentGlobalWall = {
        start: roomPointToLayout(room, layout, wall.start),
        end: roomPointToLayout(room, layout, wall.end),
      };
      const segmentMid = wallPointAt(currentGlobalWall, (segmentStart + segmentEnd) / 2);
      const segmentLength = wallLength(wall) * Math.abs(segmentEnd - segmentStart);

      for (const node of placedRoomNodes()) {
        if (node.room.id === room.id && node.layoutIndex === layoutIndex) {
          continue;
        }

        for (const otherWall of roomWallsForLayout(node.room)) {
          const otherGlobalWall = {
            start: roomPointToLayout(node.room, node.layout, otherWall.start),
            end: roomPointToLayout(node.room, node.layout, otherWall.end),
          };
          const otherPosition = projectPointToWall(segmentMid, otherGlobalWall);
          const otherProjected = wallPointAt(otherGlobalWall, otherPosition);
          const otherLength = wallLength(otherWall);

          if (
            distanceBetween(segmentMid, otherProjected) <= ROOM_CONNECTION_DISTANCE &&
            Math.abs(otherLength - segmentLength) <= ROOM_CONNECTION_DISTANCE &&
            `${node.room.id}:${node.layoutIndex}:${otherWall.id}` < `${room.id}:${layoutIndex}:${wall.id}`
          ) {
            return false;
          }
        }
      }

      return true;
    };
    const className = [
      walls.length === 0 ? "canvas-room" : "canvas-room-shape",
      preview ? "canvas-room-preview" : "",
      snapped ? "canvas-room-snapped" : "",
      !valid ? "canvas-room-invalid" : "",
      selectedRoomLayout?.roomId === room.id && selectedRoomLayout.layoutIndex === layoutIndex
        ? "canvas-room-selected"
        : "",
    ].join(" ");
    const style = {
      left: layout.x,
      top: layout.y,
      width: bounds.width,
      height: bounds.height,
      backgroundColor: walls.length === 0 ? colorWithAlpha(fillColor, "33") : "transparent",
      borderColor: fillColor,
      color: fillColor,
      transform: `rotate(${layout.rotation ?? 0}deg)`,
    };
    const startMove = (event: MouseEvent<HTMLElement | SVGSVGElement>) => {
      if (preview) {
        return;
      }

      const surface = event.currentTarget.closest(".canvas-surface") as HTMLDivElement | null;

      if (!surface) {
        return;
      }

      event.stopPropagation();
      setSelectedRoomLayout({ roomId: room.id, layoutIndex });
      setRoomLayoutRemoveError("");
      setRoomLayoutDrag({
        roomId: room.id,
        layoutIndex,
        originLayout: layout,
        originPoint: canvasPointFromClient(event.clientX, event.clientY, surface),
        snapshot: currentLayoutHistoryState(),
        changed: false,
      });
      setDragStart(null);
      setRoomPlacementPreview(null);
    };
    const selectRoom = (event: MouseEvent<HTMLElement | SVGSVGElement>) => {
      if (preview) {
        return;
      }

      event.stopPropagation();
      setSelectedRoomLayout({ roomId: room.id, layoutIndex });
      setRoomLayoutRemoveError("");
    };
    const rotateButton = () => (
      <button
        className="canvas-room-rotate"
        onClick={(event) => {
          event.stopPropagation();
          rotateRoomLayout(room.id, layoutIndex, 1);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        type="button"
      >
        <RotateCw />
      </button>
    );

    if (walls.length === 0) {
      return (
        <div
          className={className}
          key={`${room.id}-${layoutIndex}-${preview ? "preview" : "placed"}`}
          onClick={selectRoom}
          onMouseDown={startMove}
          style={style}
        >
          <span>{room.name}</span>
          <small>{room.area} м²</small>
          {!preview && <span className="canvas-room-rotate-right">{rotateButton()}</span>}
        </div>
      );
    }

    return (
      <svg
        className={className}
        key={`${room.id}-${layoutIndex}-${preview ? "preview" : "placed"}`}
        onClick={selectRoom}
        onMouseDown={startMove}
        style={style}
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
      >
        {polygonPoints && <polygon className="canvas-room-fill" fill={colorWithAlpha(fillColor, "33")} points={polygonPoints} />}
        {walls.map((wall) => (
          <g key={wall.id}>
            <line
              className="canvas-room-wall"
              stroke={fillColor}
              strokeWidth={Math.max(4, wall.thickness / 30)}
              x1={wall.start.x - bounds.minX}
              x2={wall.end.x - bounds.minX}
              y1={wall.start.y - bounds.minY}
              y2={wall.end.y - bounds.minY}
            />
            {wallMeasureSegments(wall).map((segment) => {
              const start = wallPointAt(wall, segment.start);
              const end = wallPointAt(wall, segment.end);
              const localStart = { x: start.x - bounds.minX, y: start.y - bounds.minY };
              const localEnd = { x: end.x - bounds.minX, y: end.y - bounds.minY };
              const mid = { x: (localStart.x + localEnd.x) / 2, y: (localStart.y + localEnd.y) / 2 };
              const angle = Math.atan2(localEnd.y - localStart.y, localEnd.x - localStart.x);
              const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
              const segmentLength = wallLength(wall) * Math.abs(segment.end - segment.start);

              if (segmentLength < 1) {
                return null;
              }

              if (!shouldShowWallSegmentMeasure(wall, segment.start, segment.end)) {
                return null;
              }

              return (
                <text
                  className="canvas-room-measure"
                  fill={fillColor}
                  key={segment.key}
                  transform={`rotate(${-(layout.rotation ?? 0)} ${mid.x + normal.x * 18} ${mid.y + normal.y * 18})`}
                  x={mid.x + normal.x * 18}
                  y={mid.y + normal.y * 18}
                >
                  {formatLength(segmentLength, lengthUnit)}
                </text>
              );
            })}
          </g>
        ))}
        {wallObjects.map((wallObject) => {
          const wall = walls.find((item) => item.id === wallObject.wallId);
          const object = snapshot.objectVariables.find((item) => item.id === wallObject.objectVariableId);

          if (!wall || !object) {
            return null;
          }

          const point = wallPointAt(wall, wallObject.position);
          const localPoint = { x: point.x - bounds.minX, y: point.y - bounds.minY };
          const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
          const objectWidth = Math.max(28, object.parameters.width ?? 600);
          const objectHeight = Math.max(10, Math.min(24, (object.parameters.thickness ?? object.parameters.depth ?? 100) / 2));

          return (
            <g
              className={`canvas-room-object canvas-room-object-${object.typeId}`}
              key={wallObject.id}
              transform={`translate(${localPoint.x} ${localPoint.y}) rotate(${(angle * 180) / Math.PI})`}
            >
              <rect x={-objectWidth / 2} y={-objectHeight / 2} width={objectWidth} height={objectHeight} rx="4" />
              <text transform={`rotate(${-(layout.rotation ?? 0)} 0 0)`} y="4">{object.name}</text>
            </g>
          );
        })}
        <text
          className="canvas-room-label"
          fill={fillColor}
          transform={`rotate(${-(layout.rotation ?? 0)} ${bounds.width / 2} ${bounds.height / 2})`}
          x={bounds.width / 2}
          y={bounds.height / 2 - 8}
        >
          {room.name}
        </text>
        <text
          className="canvas-room-area"
          fill={fillColor}
          transform={`rotate(${-(layout.rotation ?? 0)} ${bounds.width / 2} ${bounds.height / 2})`}
          x={bounds.width / 2}
          y={bounds.height / 2 + 18}
        >
          {room.area} м²
        </text>
        {!preview && (
          <foreignObject className="canvas-room-rotate-slot" x={bounds.width - 18} y="-18" width="36" height="36">
            {rotateButton()}
          </foreignObject>
        )}
      </svg>
    );
  };

  return (
    <div className="canvas-app">
      <CanvasSurface
        dragStart={dragStart}
        offset={canvasOffset}
        onDragLeave={() => setRoomPlacementPreview(null)}
        onDragOver={previewRoomPlacement}
        onDrop={placeRoomOnCanvas}
        onMouseDown={startCanvasDrag}
        onMouseMove={moveCanvas}
        onMouseUp={() => {
          if (roomLayoutDrag?.changed) {
            pushLayoutHistory(roomLayoutDrag.snapshot);
          }
          setDragStart(null);
          setRoomLayoutDrag(null);
          setRoomPlacementPreview(null);
        }}
        onWheel={zoomCanvas}
        scale={canvasScale}
      >
        {snapshot.project.rooms.flatMap((room) =>
          placedRoomLayouts(room).map((layout, index) => renderCanvasRoom(room, layout, false, false, true, index)),
        )}
        {roomPlacementPreview &&
          (() => {
            const room = snapshot.project.rooms.find((item) => item.id === roomPlacementPreview.roomId);
            return room
              ? renderCanvasRoom(
                  room,
                  roomPlacementPreview.layout,
                  true,
                  roomPlacementPreview.snapped,
                  roomPlacementPreview.valid,
                )
              : null;
          })()}
      </CanvasSurface>

      {!roomBoardOpen &&
        selectedRoomLayout &&
        (() => {
          const selectedRoom = snapshot.project.rooms.find((room) => room.id === selectedRoomLayout.roomId);
          const selectedLayout = selectedRoom ? placedRoomLayouts(selectedRoom)[selectedRoomLayout.layoutIndex] : null;

          if (!selectedRoom || !selectedLayout) {
            return null;
          }

          return (
            <section className="room-wall-editor placed-room-panel" aria-label="Размещенная комната">
              <h3>Комната</h3>
              <div className="placed-room-preview" style={{ borderColor: roomColor(selectedRoom) }}>
                <RoomIcon icon={selectedRoom.icon} />
                <div>
                  <strong>{selectedRoom.name}</strong>
                  <span>{selectedRoom.area} м²</span>
                </div>
              </div>
              <Button onClick={removeSelectedRoomLayout} type="button" variant="outline">
                Удалить комнату
              </Button>
              {roomLayoutRemoveError && <p className="form-error">{roomLayoutRemoveError}</p>}
            </section>
          );
        })()}

      {!roomBoardOpen && !selectedRoomLayout && (
        <section className="room-wall-editor placed-room-panel" aria-label="Площадь квартиры">
          <h3>Квартира</h3>
          <div className="area-summary">
            <span>Общая площадь</span>
            <strong>{apartmentArea} м²</strong>
          </div>
        </section>
      )}

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

      {!roomBoardOpen && (
        <UndoRedoControls
          canRedo={layoutHistoryFuture.length > 0}
          canUndo={layoutHistoryPast.length > 0}
          className="layout-undo-redo-controls"
          onRedo={redoLayoutAction}
          onUndo={undoLayoutAction}
        />
      )}

      {activePanel === "objects" && (
        <ObjectListPanel
          lockedObjectIds={lockedObjectVariableIds}
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
          onDragEnd={() => {
            setDraggedRoomId(null);
            setRoomPlacementPreview(null);
          }}
          onDragStart={setDraggedRoomId}
          onEdit={editRoom}
          rooms={snapshot.project.rooms}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          lengthUnit={lengthUnit}
          onChangeUnit={changeUnit}
          onClearAll={() => setClearAllConfirmOpen(true)}
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
          canRedo={roomHistoryFuture.length > 0}
          canUndo={roomHistoryPast.length > 0}
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
          onBoardMouseUp={() => {
            finishMoveRoomWallObject();
            setRoomDragStart(null);
            setRoomEndpointDrag(null);
            roomEndpointDragSnapshot.current = null;
          }}
          onBoardWheel={zoomRoomCanvas}
          onExitCancel={() => setRoomExitConfirmOpen(false)}
          onExitConfirm={closeRoomBoard}
          onExitRequest={() => setRoomExitConfirmOpen(true)}
          onModeToolChange={setRoomModeTool}
          onPanelChange={setRoomActivePanel}
          onRoomColorChange={setNewRoomColor}
          onRoomIconChange={setNewRoomIcon}
          onRoomDuplicateCountChange={setNewRoomDuplicateCount}
          onRoomDefaultWallThicknessChange={changeRoomDefaultWallThickness}
          onRoomDefaultWallThicknessCommit={commitRoomDefaultWallThickness}
          onRoomWallMeasureIntervalChange={changeRoomWallMeasureInterval}
          onRoomNameChange={setNewRoomName}
          onSaveRequest={saveRoomBoard}
          onSettingsOpen={() => setSettingsOpen(true)}
          onWallDeselect={deselectRoomWall}
          onRedo={redoRoomAction}
          onUndo={undoRoomAction}
          onWallEndpointSelect={startRoomWallFromEndpoint}
          onWallEndpointDragStart={startRoomWallEndpointDrag}
          onWallObjectDrop={addWallObject}
          onWallObjectMoveStart={startMoveRoomWallObject}
          onWallObjectPreview={previewWallObject}
          onWallObjectSelect={selectRoomWallObject}
          onWallSelect={selectRoomWall}
          onZoomDecrease={() => setRoomZoom(roomCanvasScale - 0.1)}
          onZoomIncrease={() => setRoomZoom(roomCanvasScale + 0.1)}
          panelContent={
            roomActivePanel === "objects" ? (
              <ObjectListPanel
                draggableObjects
                lockedObjectIds={lockedObjectVariableIds}
                onCreate={startCreate}
                onDelete={setDeleteId}
                onDragEnd={() => {
                  setRoomDraggedObjectVariableId(null);
                  setRoomObjectPreview(null);
                }}
                onDragStart={setRoomDraggedObjectVariableId}
                onEdit={editVariable}
                onPanelMouseUp={finishMoveRoomWallObject}
                snapshot={snapshot}
              />
            ) : null
          }
          objectVariables={snapshot.objectVariables}
          previewPoint={roomPreviewPoint}
          roomDraggedObjectVariableId={roomDraggedObjectVariableId}
          roomDuplicateCount={newRoomDuplicateCount}
          roomIcon={newRoomIcon}
          roomName={newRoomName}
          roomObjectPreview={roomObjectPreview}
          roomDefaultWallThickness={newRoomDefaultWallThicknessInput}
          roomWallMeasureInterval={newRoomWallMeasureInterval}
          roomColor={newRoomColor}
          roomColors={ROOM_COLORS}
          scale={roomCanvasScale}
          selectedWallId={selectedRoomWallId}
          selectedWallObjectId={selectedRoomWallObjectId}
          sideContent={
            selectedRoomWallObject ? (
              <section className="room-wall-editor" aria-label="Редактирование объекта стены">
                <h3>Объект</h3>
                <div className="placed-room-preview">
                  <ObjectTypeIcon typeId={selectedRoomWallObjectVariable?.typeId} />
                  <div>
                    <strong>{selectedRoomWallObjectVariable?.name ?? "Объект"}</strong>
                    <span>
                      {selectedRoomWallObjectVariable
                        ? selectedRoomWallObjectVariable.typeId === "window"
                          ? "Окно"
                          : "Дверь"
                        : "Объект"}
                    </span>
                  </div>
                </div>
                <Button onClick={deleteSelectedWallObject} type="button" variant="outline">
                  Удалить объект
                </Button>
              </section>
            ) : selectedRoomWall ? (
              <section className="room-wall-editor" aria-label="Редактирование стены">
                <h3>Стена</h3>
                <label className="field">
                  <span>Длина, {selectedLengthUnit.label}</span>
                  <span className="unit-input">
                    <input
                      inputMode="decimal"
                      min="0"
                      onBlur={commitSelectedWallLength}
                      onChange={(event) => changeSelectedWallLength(event.target.value)}
                      onKeyDown={commitWallFieldOnEnter}
                      type="text"
                      value={selectedWallLength}
                    />
                    <span>{selectedLengthUnit.label}</span>
                  </span>
                </label>
                <label className="field">
                  <span>Толщина, {selectedLengthUnit.label}</span>
                  <span className="unit-input">
                    <input
                      inputMode="decimal"
                      min="0"
                      onBlur={commitSelectedWallThickness}
                      onChange={(event) => changeSelectedWallThickness(event.target.value)}
                      onKeyDown={commitWallFieldOnEnter}
                      type="text"
                      value={selectedWallThickness}
                    />
                    <span>{selectedLengthUnit.label}</span>
                  </span>
                </label>
                {roomPendingJoin?.sourceWallId === selectedRoomWall.id && (
                  <Button onClick={mergePendingWallJoin} type="button" variant="outline">
                    Объединить со стеной
                  </Button>
                )}
                <Button onClick={deleteSelectedWall} type="button" variant="outline">
                  Удалить стену
                </Button>
              </section>
            ) : (
              <section className="room-wall-editor" aria-label="Площадь комнаты">
                <h3>Комната</h3>
                <div className="area-summary">
                  <span>Общая площадь</span>
                  <strong>{currentRoomArea} м²</strong>
                </div>
              </section>
            )
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

      {clearAllConfirmOpen && (
        <ConfirmDialog
          confirmLabel="Очистить"
          description="Будут удалены все комнаты, объекты и данные проекта. Это действие нельзя отменить."
          onCancel={() => setClearAllConfirmOpen(false)}
          onConfirm={clearAll}
          title="Очистить все?"
        />
      )}
    </div>
  );
}
