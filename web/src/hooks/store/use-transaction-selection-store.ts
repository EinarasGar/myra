import { create } from "zustand";

interface TransactionSelectionState {
  isSelecting: boolean;
  selectedItems: Map<string, "individual" | "group">;
  enterSelectionMode: (
    initialId?: string,
    type?: "individual" | "group",
  ) => void;
  exitSelectionMode: () => void;
  toggleItem: (id: string, type: "individual" | "group") => void;
  clearSelection: () => void;
}

export const useTransactionSelectionStore = create<TransactionSelectionState>(
  (set) => ({
    isSelecting: false,
    selectedItems: new Map(),
    enterSelectionMode: (initialId, type) =>
      set((state) => {
        const items = new Map(state.selectedItems);
        if (initialId && type) items.set(initialId, type);
        return { isSelecting: true, selectedItems: items };
      }),
    exitSelectionMode: () =>
      set({ isSelecting: false, selectedItems: new Map() }),
    toggleItem: (id, type) =>
      set((state) => {
        const items = new Map(state.selectedItems);
        if (items.has(id)) items.delete(id);
        else items.set(id, type);
        return { selectedItems: items };
      }),
    clearSelection: () => set({ selectedItems: new Map() }),
  }),
);
