import { Pencil, Plus, Trash2 } from "lucide-react";
import { RoomIcon, type Room } from "@/entities/project";
import { Button, EmptyState } from "@/shared/ui";

type RoomListPanelProps = {
  rooms: Room[];
  onCreate: () => void;
  onEdit: (room: Room) => void;
  onDelete: (id: string) => void;
  onDragEnd?: () => void;
  onDragStart?: (id: string) => void;
};

export function RoomListPanel({ rooms, onCreate, onEdit, onDelete, onDragEnd, onDragStart }: RoomListPanelProps) {
  const placedCount = (room: Room) => room.layouts?.length ?? (room.layout ? 1 : 0);
  const limit = (room: Room) => Math.max(1, room.duplicateCount ?? 1);
  const remainingCount = (room: Room) => Math.max(0, limit(room) - placedCount(room));
  const colorWithAlpha = (color: string, alpha: string) =>
    /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;

  return (
    <section className="floating-modal" aria-label="Комнаты">
      <div className="modal-header">
        <div>
          <h2>Комнаты</h2>
        </div>
        <Button onClick={onCreate} type="button">
          <Plus />
          Добавить комнату
        </Button>
      </div>

      <div className="modal-content">
        {rooms.length === 0 ? (
          <EmptyState title="Комнат пока нет" />
        ) : (
          <div className="tile-grid">
            {rooms.map((room) => {
              const remaining = remainingCount(room);

              return (
                <article
                  className={`workspace-tile room-tile ${remaining === 0 ? "room-tile-placed" : ""}`}
                  draggable={remaining > 0}
                  key={room.id}
                  onDragEnd={onDragEnd}
                  onDragStart={(event) => {
                    if (remaining <= 0) {
                      event.preventDefault();
                      return;
                    }

                    event.dataTransfer.setData("text/plain", room.id);
                    onDragStart?.(room.id);
                  }}
                >
                  <div
                    className="tile-icon"
                    style={{
                      backgroundColor: room.color ? colorWithAlpha(room.color, "22") : undefined,
                      color: room.color,
                    }}
                  >
                    <RoomIcon icon={room.icon} />
                  </div>
                  <h3>{room.name}</h3>
                  <div className="room-tile-area">
                    <strong>{room.area} м²</strong>
                    <span>{placedCount(room)}/{limit(room)}</span>
                  </div>
                  <div className="tile-actions">
                    <Button
                      disabled={placedCount(room) > 0}
                      onClick={() => onEdit(room)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      disabled={placedCount(room) > 0}
                      onClick={() => onDelete(room.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
