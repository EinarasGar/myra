import { create } from "zustand"

interface PaletteState {
  open: boolean
  query: string
  contextDismissed: boolean
  openPalette: (initialQuery?: string) => void
  closePalette: () => void
  togglePalette: () => void
  setOpen: (open: boolean) => void
  setQuery: (query: string) => void
  dismissContext: () => void
}

export const usePaletteStore = create<PaletteState>((set) => ({
  open: false,
  query: "",
  contextDismissed: false,
  openPalette: (initialQuery = "") =>
    set({ open: true, query: initialQuery, contextDismissed: false }),
  closePalette: () => set({ open: false, query: "" }),
  togglePalette: () =>
    set((state) =>
      state.open
        ? { open: false, query: "" }
        : { open: true, query: "", contextDismissed: false }
    ),
  setOpen: (open) =>
    set(open ? { open, contextDismissed: false } : { open, query: "" }),
  setQuery: (query) => set({ query }),
  dismissContext: () => set({ contextDismissed: true }),
}))
