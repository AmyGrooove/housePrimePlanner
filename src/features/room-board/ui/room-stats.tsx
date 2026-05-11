import { useMemo } from "react";
import type { Room } from "@/entities/project/model/types";
import { roomAreaFromWalls } from "@/entities/project/lib/geometry";

interface RoomStatsProps {
  room: Room;
  lengthUnit: string;
}

export function RoomStats({ room, lengthUnit }: RoomStatsProps) {
  const calculatedArea = useMemo(() => {
    if (room.walls && room.walls.length > 0) {
      const areaMm2 = roomAreaFromWalls(room.walls) as number;
      return (areaMm2 / 1_000_000).toFixed(2);
    }
    return room.area.toFixed(2);
  }, [room.walls, room.area]);

  return (
    <div className="room-stats">
      <div className="room-stat">
        <span className="room-stat-label">Площадь:</span>
        <span className="room-stat-value">{calculatedArea} м²</span>
      </div>
    </div>
  );
}
