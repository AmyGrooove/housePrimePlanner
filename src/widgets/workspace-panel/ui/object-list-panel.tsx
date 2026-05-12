import { Pencil, Plus, Trash2 } from "lucide-react";
import { ObjectTypeIcon, type ObjectVariable, type PlannerSnapshot } from "@/entities/project";
import { Button, EmptyState } from "@/shared/ui";

type ObjectListPanelProps = {
  snapshot: PlannerSnapshot;
  onCreate: () => void;
  onEdit: (variable: ObjectVariable) => void;
  onDelete: (id: string) => void;
  draggableObjects?: boolean;
  lockedObjectIds?: Set<string>;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onPanelMouseUp?: () => void;
};

export function ObjectListPanel({
  snapshot,
  onCreate,
  onEdit,
  onDelete,
  draggableObjects = false,
  lockedObjectIds = new Set(),
  onDragStart,
  onDragEnd,
  onPanelMouseUp,
}: ObjectListPanelProps) {
  const startObjectDrag = (id: string) => {
    if (draggableObjects) {
      onDragStart?.(id);
    }
  };

  return (
    <section className="floating-modal" aria-label="Объекты" onMouseUp={onPanelMouseUp}>
      <div className="modal-header">
        <div>
          <h2>Объекты</h2>
        </div>
        <Button onClick={onCreate} type="button">
          <Plus />
          Добавить объект
        </Button>
      </div>

      <div className="modal-content">
        {snapshot.objectVariables.length === 0 ? (
          <EmptyState title="Объектов пока нет" />
        ) : (
          <div className="object-tile-scroll">
            {snapshot.objectVariables.map((variable) => {
              const type = snapshot.objectTypes.find((item) => item.id === variable.typeId);
              const isLocked = lockedObjectIds.has(variable.id);

              return (
                <article
                  className="object-mini-tile"
                  draggable={draggableObjects}
                  key={variable.id}
                  onDragEnd={onDragEnd}
                  onDragStart={(event) => {
                    if (draggableObjects) {
                      event.dataTransfer.setData("text/plain", variable.id);
                      startObjectDrag(variable.id);
                    }
                  }}
                >
                  <div
                    className="tile-icon"
                    draggable={draggableObjects}
                    onDragStart={(event) => {
                      if (draggableObjects) {
                        event.dataTransfer.setData("text/plain", variable.id);
                        startObjectDrag(variable.id);
                      }
                    }}
                  >
                    <ObjectTypeIcon typeId={type?.id} />
                  </div>
                  <div className="mini-tile-text">
                    <h3>{variable.name}</h3>
                    <span>{type?.name ?? "Объект"}</span>
                  </div>
                  <div className="tile-actions">
                    <Button
                      disabled={isLocked}
                      onClick={() => onEdit(variable)}
                      size="icon"
                      title={isLocked ? "Объект используется в комнате" : undefined}
                      type="button"
                      variant="outline"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      disabled={isLocked}
                      onClick={() => onDelete(variable.id)}
                      size="icon"
                      title={isLocked ? "Объект используется в комнате" : undefined}
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
