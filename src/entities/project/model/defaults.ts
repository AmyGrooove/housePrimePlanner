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
    rooms: [],
  },
  objectTypes: defaultObjectTypes,
  objectVariables: [],
  tasks: [],
  budget: [],
  notes: [],
  settings: {
    lengthUnit: "cm",
    wallMeasureInterval: 5,
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
      rooms: snapshot.project?.rooms ?? [],
    },
    objectTypes,
    objectVariables: snapshot.objectVariables ?? [],
    tasks: snapshot.tasks ?? [],
    budget: snapshot.budget ?? [],
    notes: snapshot.notes ?? [],
    settings: {
      ...defaultSnapshot.settings,
      ...(snapshot.settings ?? {}),
    },
  };
}
