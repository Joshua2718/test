// utils.js
import { db, state, saveDbToStorage } from './db.js';
/** DOM 선택자 단축 함수 */
export function $(selector) {
  return document.querySelector(selector);
}

export function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

export function countTagUsed(id) {
  let count = 0;
  for (const song of db.songs) {
    const arrays = [
      song.producerTagIds || [],
      song.genreTagIds || [],
      song.mediaTagIds || [],
    ];
    for (const arr of arrays) {
      if (arr.includes(id)) {
        count++;
        break;
      }
    }
    if ((song.artistTagIds || [[]]).flat().includes(id)) {
      count++;
    }
    if ((song.coverTagIds || [[]]).flat().includes(id)) {
      count++;
    }
  }
  return count;
}

export function pruneUnusedTags() {
  let changed = false;
  for (const id of Object.keys(db.tags)) {
    if (countTagUsed(id) === 0) {
      delete db.tags[id];
      changed = true;
    }
  }
  if (changed) {
    saveDbToStorage();
  }
}

/** 태그 ID로 이름을 가져오는 보조 함수 (db 의존) */
export function getTagName(id) {
  const tag = db.tags[id];
  return tag ? tag.name : "(unknown)";
}

export function refreshTagsViewIfActive() {
  if (state.currentTab === "tags") {
    pruneUnusedTags();
    renderTagsTable();
  }
}

export function getTagAliases(id) {
  const tag = db.tags[id];
  return tag && Array.isArray(tag.aliases) ? tag.aliases.join(", ") : "";
}

/** 콤마와 콜라보레이션 '×' 기호 분리 */
export function splitNameTokens(str) {
  return String(str)
    .split(',')                 // 곡 단위로 분리
    .map(song => song.trim())   // 앞뒤 공백 제거
    .filter(Boolean)            // 빈 문자열 제거
    .map(song => song.split('×').map(s => s.trim()).filter(Boolean)); // 아티스트 분리
}

/** ID 생성을 위한 슬러그 변환 */
export function toSlug(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function addTag(name, type) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  // 동일 타입 + 동일 이름이면 기존 태그 재사용
  for (const [id, tag] of Object.entries(db.tags)) {
    if (tag.type === type && tag.name === trimmed) {
      return id;
    }
  }

  const slug = toSlug(trimmed);
  let baseId = `${type}_${slug || "tag"}`;
  let newId = baseId;
  let i = 1;
  while (db.tags[newId]) {
    newId = `${baseId}_${i++}`;
  }

  db.tags[newId] = {
    type,
    name: trimmed,
  };

  saveDbToStorage();
  return newId;
}

// 새 곡 id: song_000001, song_000002, ...
export function generateNextSongId() {
  let maxNum = 0;
  for (const song of db.songs) {
    const m = /^song_(\d+)$/.exec(song.id || "");
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n) && n > maxNum) maxNum = n;
  }
  const next = maxNum + 1;
  return `song_${String(next).padStart(6, "0")}`;
}

/** Title 정렬용 키 추출 */
export function getTitleSortKey(song) {
  const t = song.title || {};
  return (
    t[state.currentTitleLang] ||
    t.jp ||
    t.en ||
    t.kr ||
    ""
  ).toString();
}
