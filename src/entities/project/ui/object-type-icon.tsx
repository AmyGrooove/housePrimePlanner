import { DoorOpen, Square } from "lucide-react";
import type { ObjectTypeId } from "../model/types";

export function ObjectTypeIcon({ typeId }: { typeId: ObjectTypeId | undefined }) {
  if (typeId === "door") {
    return <DoorOpen />;
  }

  return <Square />;
}
