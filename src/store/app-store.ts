import { create } from "zustand";

export interface RecentFile {
  path: string;
  name: string;
  openedAt: number;
}

interface AppState {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  recentFiles: RecentFile[];
  error: string | null;
  isLoading: boolean;
}

interface AppActions {
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addRecentFile: (path: string) => void;
  removeRecentFile: (path: string) => void;
  setRecentFiles: (files: RecentFile[]) => void;
  clearRecentFiles: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

type AppStore = AppState & AppActions;

const SIDEBAR_WIDTH_KEY = "openapi-editor-sidebar-width";
const DEFAULT_SIDEBAR_WIDTH = 280;
const MAX_RECENT_FILES = 10;

function getStoredSidebarWidth(): number {
  try {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 180 && parsed <= 600) return parsed;
    }
  } catch {
    /* noop */
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

function extractFileName(filePath: string): string {
  const segments = filePath.split(/[/\\]/);
  return segments[segments.length - 1] || filePath;
}

export const useAppStore = create<AppStore>()((set) => ({
  sidebarWidth: getStoredSidebarWidth(),
  sidebarCollapsed: false,
  recentFiles: [],
  error: null,
  isLoading: false,

  setSidebarWidth: (width: number) => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
    } catch {
      /* noop */
    }
    set({ sidebarWidth: width });
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  addRecentFile: (path: string) => {
    set((state) => {
      const filtered = state.recentFiles.filter((f) => f.path !== path);
      const entry: RecentFile = {
        path,
        name: extractFileName(path),
        openedAt: Date.now(),
      };
      return {
        recentFiles: [entry, ...filtered].slice(0, MAX_RECENT_FILES),
      };
    });
  },

  removeRecentFile: (path: string) => {
    set((state) => ({
      recentFiles: state.recentFiles.filter((f) => f.path !== path),
    }));
  },

  setRecentFiles: (files: RecentFile[]) => {
    set({ recentFiles: files });
  },

  clearRecentFiles: () => {
    set({ recentFiles: [] });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
