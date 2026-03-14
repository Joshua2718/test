// main.js
console.log("main.js loaded");
import { db, loadDbFromStorage, saveDbToStorage } from './store.js';
import { pruneUnusedTags, addTag, generateNextSongId } from './utils.js';
import { initEvents } from './events.js';
import * as renderer from './render.js';

/** 초기 샘플 데이터 추가 (데이터가 없을 경우) */
function checkInitialData() {
  if (db.songs.length === 0) {
    console.log("Adding sample data...");
    
    const s1 = {
      id: generateNextSongId(),
      rank: 5,
      title: { jp: "夜に駆ける", en: "Racing into the Night", kr: "밤을 달리다" },
      artistTagIds: [[addTag("YOASOBI", "artist")]],
      producerTagIds: [addTag("Ayase", "producer")],
      genreTagIds: [addTag("J-POP", "genre")],
      mediaTagIds: [],
      yt_link: "https://www.youtube.com/watch?v=by4SYYWlhEs"
    };
    db.songs.push(s1);

    const s2 = {
      id: generateNextSongId(),
      rank: 4,
      title: { jp: "アイドル", en: "Idol", kr: "아이돌" },
      artistTagIds: [[addTag("YOASOBI", "artist")]],
      producerTagIds: [addTag("Ayase", "producer")],
      genreTagIds: [addTag("J-POP", "genre"), addTag("Anime", "genre")],
      mediaTagIds: [addTag("【推しの子】", "media")],
      yt_link: "https://www.youtube.com/watch?v=ZRtdQ81jPUQ"
    };
    db.songs.push(s2);

    saveDbToStorage();
  }
}

/** 애플리케이션 초기화 */
function initApp() {
  console.log("App Initializing...");
  
  // 1. 저장된 데이터 로드
  loadDbFromStorage();
  
  // 2. 샘플 데이터 체크
  checkInitialData();
  
  // 3. 태그 정리
  pruneUnusedTags();

  // 4. 이벤트 리스너 등록
  initEvents();

  // 5. 초기 화면 렌더링
  renderer.renderSongTable(); 
  renderer.renderDetailArea();
  renderer.renderTagsTable();
  renderer.updateSortHeaderUI();

  console.log("App Ready!");
}

// DOM이 이미 준비되었는지 확인 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
