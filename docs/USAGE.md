# Краткая инструкция по использованию улучшений

## Быстрый старт

### 1. Система Undo/Redo уже работает!

История изменений автоматически записывается при любых изменениях через `setSnapshot()`.

**Использование в коде:**
```tsx
import { useUndo, useRedo, useCanUndo, useCanRedo } from "@/entities/project";

function MyComponent() {
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <>
      <button disabled={!canUndo} onClick={undo}>Отменить</button>
      <button disabled={!canRedo} onClick={redo}>Повторить</button>
    </>
  );
}
```

**Добавить UI кнопки:**
```tsx
import { UndoRedoControls } from "@/shared/ui";

<UndoRedoControls
  canUndo={useCanUndo()}
  canRedo={useCanRedo()}
  onUndo={useUndo()}
  onRedo={useRedo()}
/>
```

### 2. Горячие клавиши

```tsx
import { useKeyboardShortcuts } from "@/shared/lib/use-keyboard-shortcuts";

useKeyboardShortcuts({
  "ctrl+z": undo,
  "ctrl+y": redo,
  "delete": deleteSelected,
  "escape": cancelAction,
});
```

### 3. Валидация данных

**Перед сохранением стен:**
```tsx
import { validateWalls, validateNoIntersections } from "@/entities/project/lib/validators";

const wallsResult = validateWalls(walls);
if (!wallsResult.success) {
  setError(wallsResult.error.message);
  return;
}

const intersectionResult = validateNoIntersections(walls);
if (!intersectionResult.success) {
  setError(intersectionResult.error.message);
  return;
}
```

**Валидация названия комнаты:**
```tsx
import { validateRoomName } from "@/entities/project/lib/validators";

const nameResult = validateRoomName(roomName);
if (!nameResult.success) {
  setError(nameResult.error.message);
  return;
}
```

### 4. Использование хуков вместо useState

**Было:**
```tsx
const [offset, setOffset] = useState({ x: 0, y: 0 });
const [scale, setScale] = useState(1);
const [dragStart, setDragStart] = useState(null);
// ... еще 90 useState
```

**Стало:**
```tsx
import { useCanvasState } from "@/shared/lib/use-canvas-state";

const canvas = useCanvasState(1);
// canvas.offset, canvas.scale, canvas.dragStart
// canvas.setZoom(), canvas.startDrag(), canvas.moveDrag(), canvas.endDrag()
```

**Редактор объектов:**
```tsx
import { useObjectEditor } from "@/features/object-variable-editor/lib/use-object-editor";

const objectEditor = useObjectEditor(
  objectVariables,
  lengthUnit,
  (variable) => {
    setSnapshot({
      ...snapshot,
      objectVariables: editingId
        ? objectVariables.map((v) => (v.id === editingId ? variable : v))
        : [...objectVariables, variable],
    });
  },
  (id) => {
    setSnapshot({
      ...snapshot,
      objectVariables: objectVariables.filter((v) => v.id !== id),
    });
  },
);

// objectEditor.startCreate(), objectEditor.startEdit(), objectEditor.saveVariable()
```

**Редактор стен:**
```tsx
import { useWallEditor } from "@/features/room-board/lib/use-wall-editor";

const wallEditor = useWallEditor(lengthUnit, createId);

// wallEditor.walls, wallEditor.wallObjects
// wallEditor.startWall(), wallEditor.finishWall(), wallEditor.updatePreview()
// wallEditor.selectWall(), wallEditor.deleteWall()
// wallEditor.validateCurrentWalls()
```

### 5. Геометрические вычисления

```tsx
import {
  distanceBetweenPoints,
  wallLength,
  roomAreaFromWalls,
  roomPerimeterFromWalls,
  findNearestPoint,
} from "@/entities/project/lib/geometry-service";

const distance = distanceBetweenPoints(point1, point2);
const length = wallLength(wall);
const area = roomAreaFromWalls(walls);
const perimeter = roomPerimeterFromWalls(walls);
const nearest = findNearestPoint(target, points, threshold);
```

### 6. Отображение статистики комнаты

```tsx
import { RoomStats } from "@/features/room-board/ui/room-stats";

<RoomStats room={currentRoom} lengthUnit={lengthUnit} />
```

### 7. Подсказки

```tsx
import { Tooltip, HelpTooltip } from "@/shared/ui/tooltip";

<Tooltip content="Это подсказка">
  <button>Наведи на меня</button>
</Tooltip>

<HelpTooltip content="Справка по этому полю" />
```

### 8. Мемоизация для производительности

```tsx
import { useMemoizedValue } from "@/shared/lib/use-memoized";

const filteredRooms = useMemoizedValue(
  rooms.filter((room) => room.status === "planned"),
  [rooms],
);

const totalArea = useMemoizedValue(
  rooms.reduce((sum, room) => sum + room.area, 0),
  [rooms],
);
```

## Примеры интеграции

### Пример 1: Добавить Undo/Redo в главное приложение

```tsx
// src/app/App.tsx
import { useUndo, useRedo, useCanUndo, useCanRedo } from "@/entities/project";
import { UndoRedoControls, useKeyboardShortcuts } from "@/shared/ui";

export function App() {
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  useKeyboardShortcuts({
    "ctrl+z": undo,
    "ctrl+y": redo,
  });

  return (
    <div className="canvas-app">
      <UndoRedoControls
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />
      {/* остальной код */}
    </div>
  );
}
```

### Пример 2: Использовать валидацию при сохранении комнаты

```tsx
// В функции saveRoomBoard
import { validateWalls, validateRoomName, validateNoIntersections } from "@/entities/project/lib/validators";

const saveRoomBoard = () => {
  const nameResult = validateRoomName(newRoomName);
  if (!nameResult.success) {
    setRoomError(nameResult.error.message);
    return;
  }

  const wallsResult = validateWalls(roomWalls);
  if (!wallsResult.success) {
    setRoomError(wallsResult.error.message);
    return;
  }

  const intersectionResult = validateNoIntersections(roomWalls);
  if (!intersectionResult.success) {
    setRoomError(intersectionResult.error.message);
    return;
  }

  // Сохранение...
};
```

### Пример 3: Рефакторинг App.tsx с хуками

```tsx
// Вместо 93 useState:
export function App() {
  const canvas = useCanvasState();
  const roomCanvas = useCanvasState();
  
  const snapshot = useSnapshot();
  const setSnapshot = useSetSnapshot();
  
  const objectEditor = useObjectEditor(
    snapshot.objectVariables,
    snapshot.settings.lengthUnit,
    (variable) => {
      setSnapshot({
        ...snapshot,
        objectVariables: objectEditor.editingId
          ? snapshot.objectVariables.map((v) => 
              v.id === objectEditor.editingId ? variable : v
            )
          : [...snapshot.objectVariables, variable],
      });
    },
    (id) => {
      setSnapshot({
        ...snapshot,
        objectVariables: snapshot.objectVariables.filter((v) => v.id !== id),
      });
    },
  );

  const wallEditor = useWallEditor(snapshot.settings.lengthUnit, createId);
  const roomEditor = useRoomEditor(snapshot.settings.lengthUnit);

  // Теперь вместо setCanvasScale используем canvas.setZoom
  // Вместо startCanvasDrag используем canvas.startDrag
  // И так далее...
}
```

## Что дальше?

1. **Интегрировать хуки в App.tsx** - заменить useState на useCanvasState, useObjectEditor и т.д.
2. **Добавить UI для Undo/Redo** - кнопки и горячие клавиши
3. **Использовать валидацию** - добавить проверки перед сохранением
4. **Добавить RoomStats** - показывать площадь в реальном времени
5. **Оптимизировать** - использовать useMemoizedValue для тяжелых вычислений

Все новые модули уже готовы к использованию и не ломают существующий код!
