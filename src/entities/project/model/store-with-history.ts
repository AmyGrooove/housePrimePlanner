import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultSnapshot, normalizeSnapshot } from "./defaults";
import type { PlannerSnapshot } from "./types";

interface HistoryState {
  past: PlannerSnapshot[];
  present: PlannerSnapshot;
  future: PlannerSnapshot[];
}

interface PlannerStore extends HistoryState {
  setSnapshot: (snapshot: PlannerSnapshot, recordHistory?: boolean) => void;
  resetSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY_SIZE = 50;

const createHistoryState = (snapshot: PlannerSnapshot): HistoryState => ({
  past: [],
  present: snapshot,
  future: [],
});

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => ({
      ...createHistoryState(defaultSnapshot),

      setSnapshot: (snapshot, recordHistory = true) => {
        const state = get();

        const updatedSnapshot = {
          ...snapshot,
          project: {
            ...snapshot.project,
            updatedAt: new Date().toISOString(),
          },
        };

        if (!recordHistory) {
          set({ present: updatedSnapshot });
          return;
        }

        const newPast = [...state.past, state.present];
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift();
        }

        set({
          past: newPast,
          present: updatedSnapshot,
          future: [],
        });
      },

      resetSnapshot: () => set(createHistoryState(defaultSnapshot)),

      undo: () => {
        const state = get();
        if (state.past.length === 0) return;

        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);

        set({
          past: newPast,
          present: previous,
          future: [state.present, ...state.future],
        });
      },

      redo: () => {
        const state = get();
        if (state.future.length === 0) return;

        const next = state.future[0];
        const newFuture = state.future.slice(1);

        set({
          past: [...state.past, state.present],
          present: next,
          future: newFuture,
        });
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,
    }),
    {
      name: "house-prime-planner:snapshot",
      version: 2,
      partialize: (state) => ({
        present: state.present,
      }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<{ present: PlannerSnapshot }> | undefined;
        const snapshot = normalizeSnapshot(stored?.present);

        return {
          ...current,
          ...createHistoryState(snapshot),
        };
      },
    },
  ),
);

export const useSnapshot = () => usePlannerStore((state) => state.present);
export const useSetSnapshot = () => usePlannerStore((state) => state.setSnapshot);
export const useUndo = () => usePlannerStore((state) => state.undo);
export const useRedo = () => usePlannerStore((state) => state.redo);
export const useCanUndo = () => usePlannerStore((state) => state.canUndo());
export const useCanRedo = () => usePlannerStore((state) => state.canRedo());
