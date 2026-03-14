// store.js
export const STORAGE_KEY = "resound_db_v1";

export const db = {
  songs: [],
  tags: {}
};

export const state = {
  currentTab: "table",
  currentTitleLang: "jp",
  currentSongPage: 1,
  pageSize: 10,
  selectedSongId: null,
  currentTagType: "artist",
  currentSearchQuery: "",
  sortKey: null,
  sortDir: "asc",
};

export function saveDbToStorage() {
  try {
    const data = {
      songs: db.songs,
      tags: db.tags,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save DB to localStorage:", err);
  }
}

export function loadDbFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      if (Array.isArray(data.songs)) {
        db.songs = data.songs;
      }
      if (data.tags && typeof data.tags === "object") {
        db.tags = data.tags;
      }
    }
  } catch (err) {
    console.warn("Failed to load DB from localStorage:", err);
  }
}

