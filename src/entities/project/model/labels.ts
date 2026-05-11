import type { BudgetStatus, RoomStatus, TaskPriority, TaskStatus } from "./types";

export const roomStatusLabels: Record<RoomStatus, string> = {
  planned: "Запланировано",
  "in-progress": "В работе",
  done: "Готово",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "К выполнению",
  "in-progress": "В работе",
  done: "Готово",
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export const budgetStatusLabels: Record<BudgetStatus, string> = {
  planned: "План",
  reserved: "В резерве",
  paid: "Оплачено",
};
