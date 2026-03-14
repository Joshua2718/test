// search.js
import { db, state } from './store.js';
import { getTagName, getTitleSortKey } from './utils.js';

/** 고급 검색 쿼리 파싱 */
export function parseAdvancedSearch(q) {
  const tokens = String(q)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const fields = {};       // { title: ["xxx"], artist: ["yyy"], ... }
  const textTokens = [];   // 필드 없이 들어온 자유 검색어들

  tokens.forEach((tok) => {
    const idx = tok.indexOf(":");
    if (idx > 0) {
      const key = tok.slice(0, idx).toLowerCase();
      const value = tok.slice(idx + 1).toLowerCase();
      if (!value) return;
      if (!fields[key]) fields[key] = [];
      fields[key].push(value);
    } else {
      textTokens.push(tok.toLowerCase());
    }
  });

  return { fields, textTokens };
}

/** 개별 곡이 검색 조건에 맞는지 확인 */
export function songMatchesSearch(song, parsed) {
  const { fields, textTokens } = parsed;

  const titleObj = song.title || {};
  const titleStr = [titleObj.jp, titleObj.en, titleObj.kr]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const artistStr = (song.artistTagIds || [])
    .map(getTagName)
    .join(" ")
    .toLowerCase();

  const producerStr = (song.producerTagIds || [])
    .map(getTagName)
    .join(" ")
    .toLowerCase();

  const genreStr = (song.genreTagIds || [])
    .map(getTagName)
    .join(" ")
    .toLowerCase();

  const mediaStr = (song.mediaTagIds || [])
    .map(getTagName)
    .join(" ")
    .toLowerCase();

  const rankStr = (song.rank || "").toLowerCase();
  const idStr = (song.id || "").toLowerCase();

  // 1) 자유 텍스트 토큰: 모두 매치(AND)
  for (const tk of textTokens) {
    if (
      !titleStr.includes(tk) &&
      !artistStr.includes(tk) &&
      !producerStr.includes(tk) &&
      !genreStr.includes(tk)
    ) {
      return false;
    }
  }

  // 2) 필드별 필터 (각 필드는 OR, 필드끼리는 AND)
  for (const [field, values] of Object.entries(fields)) {
    const vs = values; // 이미 소문자

    if (field === "title") {
      if (!vs.some((v) => titleStr.includes(v))) return false;
    } else if (field === "artist") {
      if (!vs.some((v) => artistStr.includes(v))) return false;
    } else if (field === "producer") {
      if (!vs.some((v) => producerStr.includes(v))) return false;
    } else if (field === "genre") {
      if (!vs.some((v) => genreStr.includes(v))) return false;
    } else if (field === "media") {
      if (!vs.some((v) => mediaStr.includes(v))) return false;
    } else if (field === "rank") {
      if (!vs.some((v) => rankStr === v)) return false;
    } else if (field === "id") {
      if (!vs.some((v) => idStr.includes(v))) return false;
    } else {
      // 모르는 필드 이름은 무시
    }
  }

  return true;
}

// 현재 검색 상태에 따라 필터링된 곡 목록 반환
export function getFilteredSongs() {
  const all = db.songs || [];
  if (!state.currentSearchQuery.trim()) return [...all];

  const parsed = parseAdvancedSearch(state.currentSearchQuery);
  return all.filter((song) => songMatchesSearch(song, parsed));
}

// 정렬 비교 함수
export function compareSongs(a, b) {
  let res = 0;

  if (state.sortKey === "rank") {
    res = a.rank - b.rank; // asc: S 먼저
  } else if (state.sortKey === "title") {
    const ak = getTitleSortKey(a);
    const bk = getTitleSortKey(b);
    res = ak.localeCompare(bk);
  } else {
    // 기본: id 기준
    res = (a.id || "").localeCompare(b.id || "");
  }

  if (state.sortKey && state.sortDir === "desc") {
    res = -res;
  }

  // 동점일 때 id로 안정 정렬
  if (res === 0) {
    return (a.id || "").localeCompare(b.id || "");
  }
  return res;
}
