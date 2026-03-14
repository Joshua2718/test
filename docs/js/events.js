// events.js
import { $, $all, pruneUnusedTags } from './utils.js';
import { db, state, saveDbToStorage } from './store.js';
import * as renderer from './render.js';
import { getFilteredSongs } from './search.js';

// ---------------------------
// Events: Tags editing
// ---------------------------
function setupTagEditing() {
  const tbody = $("#tags-table-body");
  if (!tbody) return;

  // 인라인 편집 (name / aliases)
  tbody.addEventListener(
    "blur",
    (e) => {
      const target = e.target;
      if (!target.classList.contains("tag-editable")) return;

      const field = target.dataset.tagField;
      const id = target.dataset.tagId;
      const tag = db.tags[id];
      if (!tag) return;

      const value = target.textContent.trim();
      if (field === "name") {
        if (value) {
          tag.name = value;
          saveDbToStorage();
          renderer.renderSongTable();
          renderer.renderDetailArea();
        } else {
          // 비워버리면 원래 이름 유지
          target.textContent = tag.name;
        }
      } else if (field === "aliases") {
        tag.aliases = value
          ? value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        saveDbToStorage();
      }
    },
    true
  );
}

// ---------------------------
// Events: Tabs / Settings / Pager / Tag type
// ---------------------------
function setupTabs() {
  const buttons = $all(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      if (!target) return;
      state.currentTab = target;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      $all(".view").forEach((view) => {
        view.classList.toggle("active", view.id === `view-${target}`);
      });

      if (target === "table") {
        renderer.renderSongTable();
        renderer.renderDetailArea();
      } else if (target === "tags") {
        pruneUnusedTags();
        renderer.renderTagsTable();
      }
    });
  });
}

function setupLanguageChips() {
  const chips = $all("#language-chips .chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const lang = chip.dataset.lang;
      if (!lang) return;
      state.currentTitleLang = lang;
      chips.forEach((c) => c.classList.toggle("active", c === chip));
      renderer.renderSongTable();
      renderer.renderDetailArea();
    });
  });
}

function setupPager() {
  const prev = $("#pager-prev");
  const next = $("#pager-next");
  if (prev) {
    prev.addEventListener("click", () => {
      if (state.currentSongPage > 1) {
        state.currentSongPage--;
        renderer.renderSongTable();
      }
    });
  }
  if (next) {
    next.addEventListener("click", () => {
      const filtered = getFilteredSongs();
      const totalPages = Math.max(
        1,
        Math.ceil(filtered.length / state.pageSize)
      );
      if (state.currentSongPage < totalPages) {
        state.currentSongPage++;
        renderer.renderSongTable();
      }
    });
  }
}

function setupTagTypeTabs() {
  const buttons = $all(".tag-type-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.tagType;
      if (!type) return;
      state.currentTagType = type;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      renderer.renderTagsTable();
    });
  });
}

function setupMergeTagsButton() {
  const btn = $("#btn-merge-tags");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const tbody = $("#tags-table-body");
    if (!tbody) return;

    // 선택된 태그들 수집
    const checked = Array.from(
      tbody.querySelectorAll('input.tag-select:checked')
    );
    const ids = checked
      .map((el) => el.dataset.tagId)
      .filter(Boolean);

    if (ids.length < 2) {
      alert("병합할 태그를 두 개 이상 선택해 주세요.");
      return;
    }

    // 모든 태그가 같은 type인지 확인
    const types = new Set(
      ids
        .map((id) => db.tags[id])
        .filter(Boolean)
        .map((tag) => tag.type)
    );
    if (types.size > 1) {
      alert("서로 다른 타입(artist / genre 등)의 태그는 함께 병합할 수 없습니다.");
      return;
    }

    const mergedNameRaw = prompt(
      `선택한 ${ids.length}개의 태그를 하나로 병합합니다.\n병합 후 사용할 태그 이름을 입력하세요:`
    );
    if (!mergedNameRaw) return;
    const mergedName = mergedNameRaw.trim();
    if (!mergedName) return;

    // 대표 태그 id는 첫 번째 선택 태그로 사용
    const targetId = ids[0];
    const targetTag = db.tags[targetId];
    if (!targetTag) return;

    // aliases 모으기: "병합명"이 아닌 나머지 name/aliases 전부
    const aliasSet = new Set();
    ids.forEach((id) => {
      const tag = db.tags[id];
      if (!tag) return;
      if (tag.name && tag.name !== mergedName) aliasSet.add(tag.name);
      if (Array.isArray(tag.aliases)) {
        tag.aliases.forEach((a) => {
          const v = (a || "").trim();
          if (v && v !== mergedName) aliasSet.add(v);
        });
      }
    });

    targetTag.name = mergedName;
    targetTag.aliases = Array.from(aliasSet);

    // 곡 데이터에서 tag id 변경 (artist / producer / genre / media / cover)
    const tagFields = [
      "artistTagIds",
      "producerTagIds",
      "genreTagIds",
      "mediaTagIds",
      "coverTagIds",
    ];

    db.songs.forEach((song) => {
      tagFields.forEach((field) => {
        let arr = song[field];
        if (!Array.isArray(arr)) return;

        arr = arr.map((tid) => (ids.includes(tid) ? targetId : tid));

        const seen = new Set();
        const dedup = [];
        arr.forEach((tid) => {
          if (!seen.has(tid)) {
            seen.add(tid);
            dedup.push(tid);
          }
        });
        song[field] = dedup;
      });

      // coverLinks key 재매핑
      if (song.link && song.link.coverLinks) {
        const newCoverLinks = {};
        Object.entries(song.link.coverLinks).forEach(([tid, links]) => {
          const newKey = ids.includes(tid) ? targetId : tid;

          if (!newCoverLinks[newKey]) {
            newCoverLinks[newKey] = { ...links };
          } else {
            ["youtube", "niconico", "bilibili"].forEach((k) => {
              if (!newCoverLinks[newKey][k] && links[k]) {
                newCoverLinks[newKey][k] = links[k];
              }
            });
          }
        });
        song.link.coverLinks = newCoverLinks;
      }
    });

    // 대표 태그(targetId)를 제외한 나머지 태그를 DB에서 제거
    ids.slice(1).forEach((id) => {
      delete db.tags[id];
    });

    saveDbToStorage();
    renderer.renderSongTable();
    renderer.renderDetailArea();
    renderer.renderTagsTable();
  });
}

// ---------------------------
// Search (advanced)
// ---------------------------
export function setupSearch() {
  const input = $("#search-input");
  if (!input) return;

  input.addEventListener("input", () => {
    state.currentSearchQuery = input.value || "";
    state.currentSongPage = 1;
    renderer.renderSongTable();
    renderer.renderDetailArea();
  });
}

export function initEvents() {
  setupTabs();
  setupLanguageChips();
  setupPager();
  setupTagTypeTabs();
  setupMergeTagsButton();
  setupTagEditing();
  setupSearch();
  renderer.setupSorting();
  renderer.setupOutsideTableClick();
}
