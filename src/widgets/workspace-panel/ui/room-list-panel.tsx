import { Pencil, Plus, Trash2 } from "lucide-react";
import { RoomIcon, type Room } from "@/entities/project";
import { Button, EmptyState } from "@/shared/ui";

type RoomListPanelProps = {
  rooms: Room[];
  onCreate: () => void;
  onEdit: (room: Room) => void;
  onDelete: (id: string) => void;
};

export function RoomListPanel({ rooms, onCreate, onEdit, onDelete }: RoomListPanelProps) {
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
            {rooms.map((room) => (
              <article className="workspace-tile room-tile" key={room.id}>
                <div className="tile-icon">
                  <RoomIcon icon={room.icon} />
                </div>
                <h3>{room.name}</h3>
                <div className="room-tile-area">
                  <strong>{room.area} м²</strong>
                </div>
                <div className="tile-actions">
                  <Button onClick={() => onEdit(room)} size="icon" type="button" variant="outline">
                    <Pencil />
                  </Button>
                  <Button onClick={() => onDelete(room.id)} size="icon" type="button" variant="ghost">
                    <Trash2 />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
