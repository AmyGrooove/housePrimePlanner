import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultSnapshot, normalizeSnapshot } from "./defaults";
import type { PlannerSnapshot } from "./types";

interface PlannerStore {
  snapshot: PlannerSnapshot;
  setSnapshot: (snapshot: PlannerSnapshot) => void;
  resetSnapshot: () => void;
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set) => ({
      snapshot: defaultSnapshot,
      setSnapshot: (snapshot) =>
        set({
          snapshot: {
            ...snapshot,
            project: {
              ...snapshot.project,
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      resetSnapshot: () => set({ snapshot: defaultSnapshot }),
    }),
    {
      name: "house-prime-planner:snapshot",
      version: 1,
      merge: (persisted, current) => {
        const stored = persisted as Partial<PlannerStore> | undefined;

        return {
          ...current,
          snapshot: normalizeSnapshot(stored?.snapshot),
        };
      },
    },
  ),
);
