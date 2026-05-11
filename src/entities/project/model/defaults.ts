import type { PlannerSnapshot } from "./types";

export const defaultObjectTypes: PlannerSnapshot["objectTypes"] = [
  {
    id: "door",
    name: "Дверь",
    description: "Дверной блок или полотно с шириной, высотой и толщиной.",
    icon: "door",
    parameters: [
      { key: "width", label: "Ширина" },
      { key: "height", label: "Высота" },
      { key: "thickness", label: "Толщина" },
    ],
  },
  {
    id: "window",
    name: "Окно",
    description: "Оконный блок с шириной, высотой и глубиной.",
    icon: "window",
    parameters: [
      { key: "width", label: "Ширина" },
      { key: "height", label: "Высота" },
      { key: "depth", label: "Глубина" },
    ],
  },
];

export const defaultSnapshot: PlannerSnapshot = {
  project: {
    id: "project-main",
    name: "Моя квартира",
    description: "Стартовый проект ремонта и планирования квартиры",
    updatedAt: new Date().toISOString(),
    rooms: [
      {
        id: "room-living",
        name: "Гостиная",
        area: 18.4,
        status: "in-progress",
        icon: "living",
        notes: "Проверить электрику и сценарии освещения.",
      },
      {
        id: "room-kitchen",
        name: "Кухня",
        area: 9.8,
        status: "planned",
        icon: "kitchen",
        notes: "Заложить места под технику и хранение.",
      },
      {
        id: "room-bedroom",
        name: "Спальня",
        area: 13.2,
        status: "planned",
        icon: "bed",
        notes: "Уточнить размеры шкафа и расположение розеток.",
      },
    ],
  },
  objectTypes: defaultObjectTypes,
  objectVariables: [],
  tasks: [
    {
      id: "task-electrics",
      title: "Составить схему электрики",
      roomId: "room-living",
      status: "in-progress",
      priority: "high",
      estimatedCost: 45000,
    },
    {
      id: "task-kitchen-measure",
      title: "Снять размеры кухни",
      roomId: "room-kitchen",
      status: "todo",
      priority: "medium",
      estimatedCost: 0,
    },
    {
      id: "task-paint",
      title: "Выбрать палитру стен",
      roomId: "room-bedroom",
      status: "todo",
      priority: "low",
      estimatedCost: 12000,
    },
  ],
  budget: [
    {
      id: "budget-materials",
      category: "Черновые материалы",
      amount: 180000,
      status: "planned",
    },
    {
      id: "budget-electric",
      category: "Электрика",
      amount: 65000,
      status: "reserved",
    },
    {
      id: "budget-design",
      category: "Планировочные решения",
      amount: 25000,
      status: "paid",
    },
  ],
  notes: [
    "Собрать все размеры помещений в одном месте.",
    "Отдельно отметить спорные зоны: хранение, освещение, мокрые точки.",
  ],
  settings: {
    lengthUnit: "mm",
    wallMeasureInterval: 10,
    defaultWallThickness: 120,
  },
};

export function normalizeSnapshot(snapshot: Partial<PlannerSnapshot> | undefined): PlannerSnapshot {
  if (!snapshot) {
    return defaultSnapshot;
  }

  const objectTypes = defaultObjectTypes.map((defaultType) => ({
    ...defaultType,
    ...(snapshot.objectTypes?.find((type) => type.id === defaultType.id) ?? {}),
    icon:
      snapshot.objectTypes?.find((type) => type.id === defaultType.id)?.icon ?? defaultType.icon,
    parameters:
      snapshot.objectTypes?.find((type) => type.id === defaultType.id)?.parameters ??
      defaultType.parameters,
  }));

  return {
    ...defaultSnapshot,
    ...snapshot,
    project: {
      ...defaultSnapshot.project,
      ...(snapshot.project ?? {}),
      rooms: snapshot.project?.rooms ?? defaultSnapshot.project.rooms,
    },
    objectTypes,
    objectVariables: snapshot.objectVariables ?? [],
    tasks: snapshot.tasks ?? defaultSnapshot.tasks,
    budget: snapshot.budget ?? defaultSnapshot.budget,
    notes: snapshot.notes ?? defaultSnapshot.notes,
    settings: {
      ...defaultSnapshot.settings,
      ...(snapshot.settings ?? {}),
    },
  };
}
