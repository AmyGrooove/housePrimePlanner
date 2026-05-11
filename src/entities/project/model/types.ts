export type RoomStatus = "planned" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in-progress" | "done";
export type BudgetStatus = "planned" | "reserved" | "paid";
export type ObjectTypeId = "door" | "window";
export type ObjectParameterKey = "width" | "height" | "thickness" | "depth";
export type ObjectTypeIcon = "door" | "window";
export type LengthUnit = "mm" | "cm" | "m";
export type WallMeasureInterval = 1 | 5 | 10 | 15 | 20;
export type RoomIconName =
  | "living"
  | "bed"
  | "kitchen"
  | "bath"
  | "shower"
  | "toilet"
  | "lamp"
  | "sofa"
  | "tv"
  | "dining"
  | "fridge"
  | "laundry"
  | "closet"
  | "nursery"
  | "office"
  | "library"
  | "gym"
  | "garage"
  | "garden"
  | "balcony"
  | "storage"
  | "entry"
  | "hall"
  | "home"
  | "house"
  | "building"
  | "boxes"
  | "archive"
  | "package"
  | "music"
  | "game"
  | "studio"
  | "workshop"
  | "tools"
  | "electric"
  | "light"
  | "water"
  | "heat"
  | "vent"
  | "sun";

export interface ApartmentProject {
  id: string;
  name: string;
  description: string;
  rooms: Room[];
  updatedAt: string;
}

export interface Room {
  id: string;
  name: string;
  area: number;
  status: RoomStatus;
  notes: string;
  icon?: RoomIconName;
  wallMeasureInterval?: WallMeasureInterval;
  defaultWallThickness?: number;
  boundary?: RoomBoundaryPoint[];
  walls?: RoomWall[];
  wallObjects?: RoomWallObject[];
}

export interface RoomBoundaryPoint {
  x: number;
  y: number;
}

export interface RoomWall {
  id: string;
  start: RoomBoundaryPoint;
  end: RoomBoundaryPoint;
  thickness: number;
}

export interface RoomWallObject {
  id: string;
  objectVariableId: string;
  wallId: string;
  position: number;
  side: "inside" | "outside";
  offset: number;
}

export interface RenovationTask {
  id: string;
  title: string;
  roomId: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedCost: number;
}

export interface BudgetItem {
  id: string;
  category: string;
  amount: number;
  status: BudgetStatus;
}

export interface ObjectTypeParameter {
  key: ObjectParameterKey;
  label: string;
}

export interface ObjectType {
  id: ObjectTypeId;
  name: string;
  description: string;
  icon: ObjectTypeIcon;
  parameters: ObjectTypeParameter[];
}

export interface ObjectVariable {
  id: string;
  typeId: ObjectTypeId;
  name: string;
  parameters: Partial<Record<ObjectParameterKey, number>>;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerSettings {
  lengthUnit: LengthUnit;
  wallMeasureInterval: WallMeasureInterval;
  defaultWallThickness: number;
}

export interface PlannerSnapshot {
  project: ApartmentProject;
  objectTypes: ObjectType[];
  objectVariables: ObjectVariable[];
  tasks: RenovationTask[];
  budget: BudgetItem[];
  notes: string[];
  settings: PlannerSettings;
}
