// render.js
import { db, state, saveDbToStorage } from './store.js';
import { $, pruneUnusedTags, countTagUsed, getTagName, splitNameTokens, addTag, generateNextSongId } from './utils.js';
import { compareSongs, getFilteredSongs } from './search.js';

// ---------------------------
// Rendering: Detail Area (Song Detail / Add / Edit)
// ---------------------------
export function renderAddSongForm() {
  const container = $("#song-detail-body");
  if (!container) return;

  container.innerHTML = `
    <form id="add-song-form" class="add-song-form">
      <div class="detail-section-title">新規楽曲追加</div>

      <div class="detail-field">
        <span class="detail-label">評価</span><br />
        <select name="rank" class="input">
          <option value="">-</option>
          <option value=1>⭐️</option>
          <option value=2>⭐️⭐️</option>
          <option value=3>⭐️⭐️⭐️</option>
          <option value=4>⭐️⭐️⭐️⭐️</option>
          <option value=5>⭐️⭐️⭐️⭐️⭐️</option>
        </select>
      </div>

      <div class="detail-field">
        <span class="detail-label">曲名 (JP)</span><br />
        <input type="text" name="title_jp" class="input" />
      </div>
      <div class="detail-field">
        <span class="detail-label">曲名 (EN)</span><br />
        <input type="text" name="title_en" class="input" />
      </div>
      <div class="detail-field">
        <span class="detail-label">曲名 (KR)</span><br />
        <input type="text" name="title_kr" class="input" />
      </div>

      <div class="detail-field">
        <span class="detail-label">歌唱者</span><br />
        <input type="text" name="artist_names" class="input" />
      </div>

      <div class="detail-field">
        <span class="detail-label">YouTube Links(歌唱者)</span><br />
        <input
          type="text"
          name="artist_yt"
          class="input"
          placeholder="例: yt1, yt2, yt3..."
        />
      </div>

      <div class="detail-field">
        <span class="detail-label">Niconico Links(歌唱者)</span><br />
        <input
          type="text"
          name="artist_nico"
          class="input"
          placeholder="例: sm0000001, sm0000002..."
        />
      </div>

      <div class="detail-field">
        <span class="detail-label">Bilibili Links(歌唱者)</span><br />
        <input
          type="text"
          name="artist_bili"
          class="input"
          placeholder="例: BVxxxx..., BVyyyy..."
        />
      </div>

      <div class="detail-field">
        <span class="detail-label">制作者</span><br />
        <input type="text" name="producer_names" class="input" />
      </div>

      <div class="detail-field">
        <span class="detail-label">関連作品</span><br />
        <input type="text" name="media_names" class="input" />
      </div>

      <div class="detail-field">
        <span class="detail-label">カテゴリー</span><br />
        <input type="text" name="genre_names" class="input" />
      </div>

      <div class="detail-field">
        <span class="detail-label">YouTube Link</span><br />
        <input type="text" name="artist_yt" class="input" />
      </div>

      <div class="detail-field">
        <span class="detail-label">Niconico Link</span><br />
        <input type="text" name="artist_nico" class="input" />
      </div>

      <div class="detail-field">
        <span class="detail-label">Bilibili Link</span><br />
        <input type="text" name="artist_bili" class="input" />
      </div>

      <div class="detail-actions">
        <button type="submit" class="btn btn-primary">保存</button>
      </div>
      <p class="muted" style="margin-top:6px;">
        ※ 評価は楽曲の評点を表します。表示順は内部ID（song_000001 など）で管理されます。<br />
        曲名／歌唱者／制作者／関連作品／カテゴリー／YouTube／ニコニコ動画／bilibili を保存します。
      </p>
    </form>
  `;

  const form = $("#add-song-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    let rank = Number(formData.get("rank")) || "";
    const title_jp = (formData.get("title_jp") || "").toString().trim();
    const title_en = (formData.get("title_en") || "").toString().trim();
    const title_kr = (formData.get("title_kr") || "").toString().trim();
    const artist_names = (formData.get("artist_names") || "").toString().trim();
    const producer_names = (formData.get("producer_names") || "").toString().trim();
    const genre_names = (formData.get("genre_names") || "").toString().trim();
    const media_names = (formData.get("media_names") || "").toString().trim();
    const artist_yt = (formData.get("artist_yt") || "").toString().trim();
    const artist_nico = (formData.get("artist_nico") || "").toString().trim();
    const artist_bili = (formData.get("artist_bili") || "").toString().trim();

    // 최소한 JP/EN/KR 중 하나는 있어야 한다고 가정
    if (!title_jp && !title_en && !title_kr) {
      alert("曲名は日本語・英語・韓国語のうち、いずれか一つ以上を入力してください。");
      return;
    }

    // ----- 제목 중복 검사 -----
    const normalizedNew = [title_jp, title_en, title_kr]
      .map(t => t.trim())
      .filter(Boolean);

    const duplicate = db.songs.find(song => {
      const t = song.title || {};
      const existing = [t.jp, t.en, t.kr]
        .map(x => (x || "").trim())
        .filter(Boolean);

      // 하나라도 완전 동일하면 중복으로 처리
      return normalizedNew.some(v => existing.includes(v));
    });

    if (duplicate) {
      const titlePreview =
        duplicate.title.jp ||
        duplicate.title.en ||
        duplicate.title.kr ||
        "(no title)";
      const ok = confirm(
        `同じ曲名の楽曲がすでに登録されています。\n\n` +
        `既存の楽曲ID：${duplicate.id}\n` +
        `曲名：${titlePreview}\n\n` +
        `このまま追加してもよろしいですか？`
      );
      if (!ok) return;
    }

    // 새 song id
    const newId = generateNextSongId();

    // artist 태그 자동 생성/재사용 (콜라보 대응: '×' 구분자로)
    const artistTagIds = [];

    splitNameTokens(artist_names).forEach((collabNames) => {
      const collabIds = collabNames.map((name) => addTag(name, "artist")).filter(Boolean);
      if (collabIds.length > 0) {
        artistTagIds.push(collabIds); // 콜라보 단위로 push
      }
    });

    // producer 태그들
    const producerTagIds = [];
    if (producer_names) {
      producer_names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((name) => {
          const id = addTag(name, "producer");
          if (id) producerTagIds.push(id);
        });
    }

    // genre 태그들
    const genreTagIds = [];
    if (genre_names) {
      genre_names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((name) => {
          const id = addTag(name, "genre");
          if (id) genreTagIds.push(id);
        });
    }

    // Featured Media 태그들 (내부 type은 "media")
    const mediaTagIds = [];
    if (media_names) {
      media_names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((name) => {
          const id = addTag(name, "media");
          if (id) mediaTagIds.push(id);
        });
    }

    const artistLinks = {};
    if (artist_names) {
      const artistYtArr = artist_yt ? artist_yt.split(",").map((s) => s.trim()) : [];
      const artistNicoArr = artist_nico ? artist_nico.split(",").map((s) => s.trim()) : [];
      const artistBiliArr = artist_bili ? artist_bili.split(",").map((s) => s.trim()) : [];

      artist_names.split(",").map((s) => s.trim()).filter(Boolean).forEach((block, idx) => {
        const yt = artistYtArr[idx] || "";
        const nico = artistNicoArr[idx] || "";
        const bili = artistBiliArr[idx] || "";

        artistLinks[block] = {
          youtube: yt,
          niconico: nico,
          bilibili: bili,
         };
       });
    }

    const newSong = {
      id: newId,
      rank: rank || "",
      title: {
        jp: title_jp || "",
        en: title_en || "",
        kr: title_kr || "",
      },
      artistTagIds,
      producerTagIds,
      genreTagIds,
      mediaTagIds,
      coverTagIds: [],
      link: {
        artistLinks
        coverLinks: {},
      },
    };

    db.songs.push(newSong);
    saveDbToStorage();

    state.selectedSongId = newId;
    state.currentSongPage = Math.max(
      1,
      Math.ceil(db.songs.length / state.pageSize)
    );

    saveDbToStorage();
    pruneUnusedTags();
    renderSongTable();
    renderSongDetail();
    refreshTagsViewIfActive();
  });
}

export function renderEditSongForm(song) {
  const container = $("#song-detail-body");
  if (!container) return;

  const title = song.title || {};
  const artistText = (song.artistTagIds || [[]]).map((collabNames) => collabNames.map(getTagName).join("×")).join(", ");
  const producerText = (song.producerTagIds || []).map(getTagName).join(", ");
  const genreText = (song.genreTagIds || []).map(getTagName).join(", ");
  const mediaText = (song.mediaTagIds || []).map(getTagName).join(", ");

  const yt = song.link?.artist?.youtube || "";
  const nico = song.link?.artist?.niconico || "";
  const bili = song.link?.artist?.bilibili || "";

  const artistLinks = (song.link && song.link.artistLinks) || {};
  const artistYtText = (song.artistTagIds || []).map((ids) => (artistLinks[ids.map(getTagName).join("×")]?.youtube || "")).join(", ");
  const artistNicoText = (song.artistTagIds || []).map((ids) => (artistLinks[ids.map(getTagName).join("×")]?.niconico || "")).join(", ");
  const artistBiliText = (song.artistTagIds || []).map((ids) => (artistLinks[ids.map(getTagName).join("×")]?.bilibili || "")).join(", ");

  const coverIds = song.coverTagIds || [];
  const coverLinks = (song.link && song.link.coverLinks) || {};

  const coverNamesText = coverIds.map((ids) => ids.map(getTagName).join("×")).join(", ");
  const coverYtText = coverIds.map((ids) => (coverLinks[ids.map(getTagName).join("×")]?.youtube || "")).join(", ");
  const coverNicoText = coverIds.map((ids) => (coverLinks[ids.map(getTagName).join("×")]?.niconico || "")).join(", ");
  const coverBiliText = coverIds.map((ids) => (coverLinks[ids.map(getTagName).join("×")]?.bilibili || "")).join(", ");

  container.innerHTML = `
    <form id="edit-song-form" class="add-song-form">
      <div class="detail-section-title">編集</div>

      <div class="detail-field">
        <span class="detail-label">ID</span><br />
        <span>${song.id}</span>
      </div>

      <div class="detail-field">
        <span class="detail-label">評価</span><br />
        <select name="rank" class="input">
          <option value="" ${!song.rank ? "selected" : ""}>-</option>
          <option value=1 ${song.rank === 1 ? "selected" : ""}>⭐️</option>
          <option value=2 ${song.rank === 2 ? "selected" : ""}>⭐️⭐️</option>
          <option value=3 ${song.rank === 3 ? "selected" : ""}>⭐️⭐️⭐️</option>
          <option value=4 ${song.rank === 4 ? "selected" : ""}>⭐️⭐️⭐️⭐️</option>
          <option value=5 ${song.rank === 5 ? "selected" : ""}>⭐️⭐️⭐️⭐️⭐️</option>
        </select>
      </div>

      <div class="detail-field">
        <span class="detail-label">曲名 (JP)</span><br />
        <input type="text" name="title_jp" class="input" value="${title.jp || ""}" />
      </div>
      <div class="detail-field">
        <span class="detail-label">曲名 (EN)</span><br />
        <input type="text" name="title_en" class="input" value="${title.en || ""}" />
      </div>
      <div class="detail-field">
        <span class="detail-label">曲名 (KR)</span><br />
        <input type="text" name="title_kr" class="input" value="${title.kr || ""}" />
      </div>

      <div class="detail-field">
        <span class="detail-label">歌唱者</span><br />
        <input type="text" name="artist_names" class="input" value="${artistText}" />
      </div>

      <div class="detail-field">
        <span class="detail-label">YouTube Links(歌唱者)</span><br />
        <input
          type="text"
          name="artist_yt"
          class="input"
          placeholder="例: yt1, yt2, yt3..."
          value="${artistYtText}"
        />
      </div>

      <div class="detail-field">
        <span class="detail-label">Niconico Links(歌唱者)</span><br />
        <input
          type="text"
          name="artist_nico"
          class="input"
          placeholder="例: sm0000001, sm0000002..."
          value="${artistNicoText}"
        />
      </div>

      <div class="detail-field">
        <span class="detail-label">Bilibili Links(歌唱者)</span><br />
        <input
          type="text"
          name="artist_bili"
          class="input"
          placeholder="例: BVxxxx..., BVyyyy..."
          value="${artistBiliText}"
        />
      </div>

      <div class="detail-field">
        <span class="detail-label">制作者</span><br />
        <input type="text" name="producer_names" class="input" value="${producerText}" />
      </div>

      <div class="detail-field">
        <span class="detail-label">関連作品</span><br />
        <input type="text" name="media_names" class="input" value="${mediaText}" />
      </div>

      <div class="detail-field">
        <span class="detail-label">カテゴリー</span><br />
        <input type="text" name="genre_names" class="input" value="${genreText}" />
      </div>

      <div class="detail-field">
        <span class="detail-label">YouTube Link</span><br />
        <input type="text" name="yt_link" class="input" value="${yt}" />
      </div>

      <div class="detail-field">
        <span class="detail-label">Niconico Link</span><br />
        <input type="text" name="nico_link" class="input" value="${nico}" />
      </div>

      <div class="detail-field">
        <span class="detail-label">Bilibili Link</span><br />
        <input type="text" name="bili_link" class="input" value="${bili}" />
      </div>

      <div class="detail-section-title" style="margin-top:16px;">Covers</div>

      <div class="detail-field">
        <span class="detail-label">歌唱者(カバー)</span><br />
        <input
          type="text"
          name="cover_names"
          class="input"
          value="${coverNamesText}"
        />
      </div>

      <div class="detail-field">
        <span class="detail-label">YouTube Links(カバー)</span><br />
        <input
          type="text"
          name="cover_yt"
          class="input"
          placeholder="例: yt1, yt2, yt3..."
          value="${coverYtText}"
        />
      </div>

      <div class="detail-field">
        <span class="detail-label">Niconico Links(カバー)</span><br />
        <input
          type="text"
          name="cover_nico"
          class="input"
          placeholder="例: sm0000001, sm0000002..."
          value="${coverNicoText}"
        />
      </div>

      <div class="detail-field">
        <span class="detail-label">Bilibili Links(カバー)</span><br />
        <input
          type="text"
          name="cover_bili"
          class="input"
          placeholder="例: BVxxxx..., BVyyyy..."
          value="${coverBiliText}"
        />
      </div>

      <div class="detail-actions">
        <button type="submit" class="btn btn-primary">保存</button>
        <button type="button" id="edit-cancel-btn" class="btn">キャンセル</button>
      </div>
      <p class="muted" style="margin-top:6px;">
        ※ カバー情報は編集画面でのみ管理できます。
      </p>
    </form>
  `;

  const form = $("#edit-song-form");
  const cancelBtn = $("#edit-cancel-btn");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      renderSongDetail();
    });
  }

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    let rank = Number(formData.get("rank") || "");
    const title_jp = (formData.get("title_jp") || "").toString().trim();
    const title_en = (formData.get("title_en") || "").toString().trim();
    const title_kr = (formData.get("title_kr") || "").toString().trim();

    const artist_names = (formData.get("artist_names") || "").toString().trim();
    const producer_names = (formData.get("producer_names") || "").toString().trim();
    const genre_names = (formData.get("genre_names") || "").toString().trim();
    const media_names = (formData.get("media_names") || "").toString().trim();

    const yt_link = (formData.get("yt_link") || "").toString().trim();
    const nico_link = (formData.get("nico_link") || "").toString().trim();
    const bili_link = (formData.get("bili_link") || "").toString().trim();

    const artist_yt = (formData.get("artist_yt") || "").toString().trim();
    const artist_nico = (formData.get("artist_nico") || "").toString().trim();
    const artist_bili = (formData.get("artist_bili") || "").toString().trim();

    if (!title_jp && !title_en && !title_kr) {
      alert("曲名は日本語・英語・韓国語のうち、いずれか一つ以上を入力してください。");
      return;
    }
    
    // ----- 제목 중복 검사 -----
    const normalizedNew = [title_jp, title_en, title_kr]
      .map(t => t.trim())
      .filter(Boolean);

    const duplicate = db.songs.find(song => {
      // 자기 자신이면 검사 제외
      if (song.id === state.selectedSongId) return false; // ← selectedSongId: 편집 중인 곡의 ID

      const t = song.title || {};
      const existing = [t.jp, t.en, t.kr]
        .map(x => (x || "").trim())
        .filter(Boolean);

      // 하나라도 완전 동일하면 중복으로 처리
      return normalizedNew.some(v => existing.includes(v));
    });

    if (duplicate) {
      const titlePreview =
        duplicate.title.jp ||
        duplicate.title.en ||
        duplicate.title.kr ||
        "(no title)";
      const ok = confirm(
        `同じ曲名の楽曲がすでに登録されています。\n\n` +
        `既存の楽曲ID：${duplicate.id}\n` +
        `曲名：${titlePreview}\n\n` +
        `このまま追加してもよろしいですか？`
      );
      if (!ok) return;
    }

    song.rank = rank || "";
    song.title = {
      jp: title_jp,
      en: title_en,
      kr: title_kr,
    };

    // artist 태그 자동 생성/재사용 (콜라보 대응: '×' 구분자로)
    const artistTagIds = [];

    splitNameTokens(artist_names).forEach((collabNames) => {
      const collabIds = collabNames.map((name) => addTag(name, "artist")).filter(Boolean);
      if (collabIds.length > 0) {
        console.log(collabIds);
        artistTagIds.push(collabIds); // 콜라보 단위로 push
      }
    });
    song.artistTagIds = artistTagIds;

    // Producer 태그
    const producerTagIds = [];
    if (producer_names) {
      producer_names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((name) => {
          const id = addTag(name, "producer");
          if (id) producerTagIds.push(id);
        });
    }
    song.producerTagIds = producerTagIds;

    // Genre 태그
    const genreTagIds = [];
    if (genre_names) {
      genre_names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((name) => {
          const id = addTag(name, "genre");
          if (id) genreTagIds.push(id);
        });
    }
    song.genreTagIds = genreTagIds;

    // Featured Media 태그
    const mediaTagIds = [];
    if (media_names) {
      media_names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((name) => {
          const id = addTag(name, "media");
          if (id) mediaTagIds.push(id);
        });
    }
    song.mediaTagIds = mediaTagIds;

    // 링크 업데이트
    song.link = song.link || {};
    song.link.artist = {
      youtube: yt_link,
      niconico: nico_link,
      bilibili: bili_link,
    };
    song.link.artistLinks = {};
    const artistYtArr = artist_yt ? artist_yt.split(",").map((s) => s.trim()) : [];
    const artistNicoArr = artist_nico ? artist_nico.split(",").map((s) => s.trim()) : [];
    const artistBiliArr = artist_bili ? artist_bili.split(",").map((s) => s.trim()) : [];

    artist_names.split(",").map((s) => s.trim()).filter(Boolean).forEach((block, idx) => {
      const yt = artistYtArr[idx] || "";
      const nico = artistNicoArr[idx] || "";
      const bili = artistBiliArr[idx] || "";

      song.link.artistLinks[block] = {
        youtube: yt,
        niconico: nico,
        bilibili: bili,
      };
    });

    song.link.coverLinks = song.link.coverLinks || {};

    // 커버
    const cover_names = (formData.get("cover_names") || "").toString().trim();
    const cover_yt = (formData.get("cover_yt") || "").toString().trim();
    const cover_nico = (formData.get("cover_nico") || "").toString().trim();
    const cover_bili = (formData.get("cover_bili") || "").toString().trim();

    const coverTagIds = [];

    splitNameTokens(cover_names).forEach((collabNames) => {
      const coverCollab = collabNames.map((name) => addTag(name, "artist")).filter(Boolean);
      if (coverCollab.length > 0) {
        coverTagIds.push(coverCollab); // 콜라보 단위로 push
      }
    });

    song.coverTagIds = coverTagIds

    const coverYtArr = cover_yt ? cover_yt.split(",").map((s) => s.trim()) : [];
    const coverNicoArr = cover_nico ? cover_nico.split(",").map((s) => s.trim()) : [];
    const coverBiliArr = cover_bili ? cover_bili.split(",").map((s) => s.trim()) : [];

    song.link.coverLinks = {};
    cover_names.split(",").map((s) => s.trim()).filter(Boolean).forEach((block, idx) => {
      const yt = coverYtArr[idx] || "";
      const nico = coverNicoArr[idx] || "";
      const bili = coverBiliArr[idx] || "";

      song.link.coverLinks[block] = {
        youtube: yt,
        niconico: nico,
        bilibili: bili,
      };
    });

    saveDbToStorage();
    pruneUnusedTags();
    renderSongTable();
    renderSongDetail();
    refreshTagsViewIfActive();
  });
}

export function renderDetailArea() {
  if (state.selectedSongId) {
    renderSongDetail();
  } else {
    renderAddSongForm();
  }
}

export function renderSongDetail() {
  const container = $("#song-detail-body");
  if (!container) return;

  if (!state.selectedSongId) {
    renderAddSongForm();
    return;
  }

  const song = db.songs.find((s) => s.id === state.selectedSongId);
  if (!song) {
    container.innerHTML =
      '<p class="muted">Selected song not found in DB.</p>';
    return;
  }

  const title = song.title || {};
  const artistNames = (song.artistTagIds || [[]]).map((collabNames) => collabNames.map(getTagName).join("×")).join(",");
  const artistLinks = (song.link && song.link.artistLinks) || {};
  const producerNames = (song.producerTagIds || [])
    .map(getTagName)
    .join(", ");
  const genres = (song.genreTagIds || []).map(getTagName).join(", ");
  const coverIds = song.coverTagIds || [];
  const coverLinks = (song.link && song.link.coverLinks) || {};
  const rankDisplay = "⭐️".repeat(song.rank) || "-";

  const yt = song.link?.artist?.youtube || "";
  const nico = song.link?.artist?.niconico || "";
  const bili = song.link?.artist?.bilibili || "";

  container.innerHTML = `
    <div class="detail-grid">
      <div>
        <div class="detail-section-title">楽曲詳細</div>
        <div class="detail-field">
          <span class="detail-label">ID: </span>${song.id}
        </div>
        <div class="detail-field">
          <span class="detail-label">評価: </span>${rankDisplay}
        </div>
        <div class="detail-field">
          <span class="detail-label">曲名 (JP): </span>${title.jp || "-"}
        </div>
        <div class="detail-field">
          <span class="detail-label">曲名 (EN): </span>${title.en || "-"}
        </div>
        <div class="detail-field">
          <span class="detail-label">曲名 (KR): </span>${title.kr || "-"}
        </div>
        <div class="detail-field">
          <span class="detail-label">歌唱者: </span>
          ${
            (song.artistTagIds || []).length
              ? (song.artistTagIds || [])
                  .map((ids) => {
                    const name = ids.map((id) => getTagName(id)).join("×");
                    const links = artistLinks[name] || {};
                    const parts = [];

                    if (links.youtube) {
                      parts.push(
                        `<a href="${links.youtube}" target="_blank" rel="noopener noreferrer">YouTube</a>`
                      );
                    }
                    if (links.niconico) {
                      parts.push(
                        `<a href="${links.niconico}" target="_blank" rel="noopener noreferrer">Niconico</a>`
                      );
                    }
                    if (links.bilibili) {
                      parts.push(
                        `<a href="${links.bilibili}" target="_blank" rel="noopener noreferrer">Bilibili</a>`
                      );
                    }

                    const linksText = parts.join(" / ") || "";
                    return `<div class="cover-link-row">
                              <span class="badge badge-artist">${name}</span>
                               ${linksText}
                            </div>`;
                  })
                  .join("")
              : "-"
          }
        </div>
        <div class="detail-field">
          <span class="detail-label">制作者: </span>${producerNames || "-"}
        </div>
        <div class="detail-field">
          <span class="detail-label">カテゴリー: </span>${genres || "-"}
        </div>
      </div>
      <div>
        <div class="detail-section-title">リンク & 関連作品</div>
        <div class="detail-field link-row">
          <span class="detail-label">YouTube: </span>
          ${
            yt
              ? `<a href="${yt}" target="_blank" rel="noopener noreferrer">${yt}</a>`
              : "-"
          }
        </div>
        <div class="detail-field link-row">
          <span class="detail-label">Niconico: </span>
          ${
            nico
              ? `<a href="${nico}" target="_blank" rel="noopener noreferrer">${nico}</a>`
              : "-"
          }
        </div>
        <div class="detail-field link-row">
          <span class="detail-label">Bilibili: </span>
          ${
            bili
              ? `<a href="${bili}" target="_blank" rel="noopener noreferrer">${bili}</a>`
              : "-"
          }
        </div>
        <div class="detail-field">
          <span class="detail-label">関連作品: </span>
          ${
            (song.mediaTagIds || [])
              .map((id) => `<span class="badge">${getTagName(id)}</span>`)
              .join(" ") || "-"
          }
        </div>
        <div class="detail-field">
          <span class="detail-label">Cover 動画: </span>
          ${
            coverIds.length
              ? coverIds
                  .map((ids) => {
                    const name = ids.map((id) => getTagName(id)).join("×");
                    const links = coverLinks[name] || {};
                    const parts = [];

                    if (links.youtube) {
                      parts.push(
                        `<a href="${links.youtube}" target="_blank" rel="noopener noreferrer">YouTube</a>`
                      );
                    }
                    if (links.niconico) {
                      parts.push(
                        `<a href="${links.niconico}" target="_blank" rel="noopener noreferrer">Niconico</a>`
                      );
                    }
                    if (links.bilibili) {
                      parts.push(
                        `<a href="${links.bilibili}" target="_blank" rel="noopener noreferrer">Bilibili</a>`
                      );
                    }

                    const linksText = parts.join(" / ") || "-";
                    return `<div class="cover-link-row">
                              <span class="badge badge-artist">${name}</span>
                              &nbsp;${linksText}
                            </div>`;
                  })
                  .join("")
              : "-"
          }
        </div>
      </div>
    </div>
    <div class="detail-actions">
      <button id="song-edit-btn" class="btn btn-primary" type="button">編集</button>
      <button id="song-delete-btn" class="btn btn-danger" type="button">削除</button>
    </div>
  `;

  // Edit 버튼 → 편집 폼으로 전환
  const editBtn = document.getElementById("song-edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      renderEditSongForm(song);
    });
  }

  // Delete 구현
  const deleteBtn = document.getElementById("song-delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      const titleStr =
        title.jp || title.en || title.kr || "(no title)";
      const ok = confirm(
        `정말로 이 곡을 삭제할까요?\n\n[${song.id}] ${titleStr}`
      );
      if (!ok) return;

      const idx = db.songs.findIndex((s) => s.id === song.id);
      if (idx >= 0) {
        db.songs.splice(idx, 1);
        saveDbToStorage();
      }

      // 선택 곡 초기화
      state.selectedSongId = null;

      // 페이지 조정
      const total = db.songs.length;
      const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
      if (state.currentSongPage > totalPages) state.currentSongPage = totalPages;

      //ID 재부여
        db.songs.forEach((song, index) => {
          const newNum = index + 1; // 1부터 시작
          const newId = `song_${String(newNum).padStart(6, "0")}`;
          
          // 만약 기존 ID와 다르다면 업데이트
          if (song.id !== newId) {
            song.id = newId;
          }
        });

      saveDbToStorage();
      pruneUnusedTags();
      renderSongTable();
      renderSongDetail();
      refreshTagsViewIfActive();
    });
  }
}

// ---------------------------
// Rendering: Song Table
// ---------------------------
export function renderSongTable() {
  const tbody = $("#song-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  const filtered = getFilteredSongs();
  const sorted = [...filtered].sort(compareSongs);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.currentSongPage > totalPages) state.currentSongPage = totalPages;

  const startIdx = (state.currentSongPage - 1) * state.pageSize;
  const pageItems = sorted.slice(startIdx, startIdx + state.pageSize);

  for (const song of pageItems) {
    const tr = document.createElement("tr");
    tr.dataset.songId = song.id;

    if (song.id === state.selectedSongId) {
      tr.classList.add("selected");
    }

    const titleObj = song.title || {};
    let titleText =
      titleObj[state.currentTitleLang] ||
      titleObj.jp ||
      titleObj.en ||
      titleObj.kr ||
      "(no title)";

    const artistNames = (song.artistTagIds || [[]]).map((collabNames) => collabNames.map(getTagName).join("×"));
    const producerNames = (song.producerTagIds || []).map(getTagName);
    const genreNames = (song.genreTagIds || []).map(getTagName);
    const mediaNames = (song.mediaTagIds || []).map(getTagName);

    tr.innerHTML = `
      <td>${"⭐️".repeat(song.rank) || "-"}</td>
      <td>${titleText}</td>
      <td>
        ${
          artistNames
            .map((g) => `<span class="badge badge-artist">${g}</span>`)
            .join(" ") || ""
        }
      </td>
      <td>
        ${
          producerNames
            .map((g) => `<span class="badge badge-producer">${g}</span>`)
            .join(" ") || ""
        }
      </td>
      <td>
        ${
          genreNames
            .map((g) => `<span class="badge badge-genre">${g}</span>`)
            .join(" ") || ""
        }
      </td>
      <td>
        ${
          mediaNames
            .map((g) => `<span class="badge badge-media">${g}</span>`)
            .join(" ") || ""
        }
      </td>
    `;

    tr.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedSongId = song.id;
      renderSongTable();
      renderDetailArea();
    });

    tbody.appendChild(tr);
  }

  const allCount = (db.songs || []).length;

  const footer = $("#table-footer-info");
  if (footer) {
    footer.textContent =
      state.currentSearchQuery.trim()
        ? `${total} / ${allCount} 曲 (絞り込み済み)`
        : `${total} 曲`;
  }

  const pager = $("#pager-page");
  if (pager) {
    pager.textContent = `${state.currentSongPage} / ${totalPages}`;
  }
}

// ---------------------------
// Rendering: Tags
// ---------------------------
export function renderTagsTable() {
  const tbody = $("#tags-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  const entries = Object.entries(db.tags).filter(
    ([, tag]) => tag.type === state.currentTagType
  );

  for (const [id, tag] of entries) {
    const tr = document.createElement("tr");
    const used = countTagUsed(id);
    const aliases = Array.isArray(tag.aliases) ? tag.aliases.join(", ") : "";

    tr.innerHTML = `
      <td>
        <input
          type="checkbox"
          class="tag-select"
          data-tag-id="${id}"
        />
      </td>
      <td contenteditable="true"
          class="tag-editable"
          data-tag-field="name"
          data-tag-id="${id}">
        ${tag.name}
      </td>
      <td contenteditable="true"
          class="tag-editable"
          data-tag-field="aliases"
          data-tag-id="${id}">
        ${aliases}
      </td>
      <td>${tag.type}</td>
      <td class="tag-used-count">${used}</td>
    `;
    tbody.appendChild(tr);
  }
}

// ---------------------------
// Sorting (Rank, Title)
// ---------------------------
export function getSongHeaderCells() {
  const tbody = document.getElementById("song-table-body");
  if (!tbody) return [];
  const table = tbody.closest("table");
  if (!table) return [];
  const ths = table.querySelectorAll("thead th");
  return Array.from(ths);
}

export function updateSortHeaderUI() {
  const ths = getSongHeaderCells();
  if (!ths.length) return;

  ths.forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
  });

  if (!state.sortKey) return;

  let idx = -1;
  if (state.sortKey === "rank") idx = 0;
  else if (state.sortKey === "title") idx = 1;

  if (idx >= 0 && ths[idx]) {
    ths[idx].classList.add(state.sortDir === "asc" ? "sort-asc" : "sort-desc");
  }
}

export function setupSorting() {
  const ths = getSongHeaderCells();
  if (!ths.length) {
    console.warn("Song table header(th) not found – sorting disabled");
    return;
  }

  const rankTh = ths[0];
  const titleTh = ths[1];

  function toggleSort(key) {
    if (state.sortKey !== key) {
      state.sortKey = key;
      state.sortDir = "asc";
    } else {
      if (state.sortDir === "asc") {
        state.sortDir = "desc";
      } else {
        state.sortKey = null;
        state.sortDir = "asc";
      }
    }
    state.currentSongPage = 1;
    updateSortHeaderUI();
    renderSongTable();
  }

  if (rankTh) {
    rankTh.style.cursor = "pointer";
    rankTh.addEventListener("click", () => toggleSort("rank"));
  }

  if (titleTh) {
    titleTh.style.cursor = "pointer";
    titleTh.addEventListener("click", () => toggleSort("title"));
  }

  updateSortHeaderUI();
}

// ---------------------------
// Background click → reset to Add Song form
// ---------------------------
export function setupOutsideTableClick() {
  const bg = document.getElementById("page-bg");
  if (!bg) return;

  bg.addEventListener("click", () => {
    state.selectedSongId = null;
    renderSongTable();
    renderAddSongForm();
  });
}
