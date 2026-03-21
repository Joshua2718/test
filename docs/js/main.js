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
      title: {
        jp: "帝国少女",
        en: "Imperial Girl",
        kr: "제국소녀"
      },
      artistTagIds: [[addTag("Hatsune Miku", "artist")]],
      producerTagIds: [addTag("R Sound Design", "producer")],
      genreTagIds: [addTag("Vocaloid", "genre")],
      mediaTagIds: [],
      coverTagIds: [[addTag("Sawako", "artist")]],
      link: {
        artistLinks: {
          "Hatsune Miku":{
            "youtube":"https://youtu.be/hUaVxNUCbc4",
            "niconico":"https://www.nicovideo.jp/watch/sm30788596",
            "bilibili":""
          }
        },
        coverLinks: {
          "Sawako":{
            "youtube":"https://youtu.be/2EIc8ETpoYA",
            "niconico":"https://sp.nicovideo.jp/watch/sm33240339",
            "bilibili":"https://www.bilibili.com/video/BV1Cx411h7ud"
          },
        },
    };
    db.songs.push(s1);

    const s2 = {
      "id": generateNextSongId(),
      "rank": 5,
      "title": {
        "jp": "This game",
        "en": "This game",
        "kr": "This game"
      },
      "artistTagIds": [[addTag("Suzuki Konomi", "artist")]],
      "producerTagIds": [],
      "genreTagIds": [],
      "mediaTagIds": [[addTag("No Game No Life", "media")]],
      "coverTagIds": [],
      "link": {
        "artistLinks": {
          "Suzuki Konomi": {
            "youtube": "https://youtu.be/kJ04dMmimn8",
            "niconico": "",
            "bilibili": ""
          }
        },
        "coverLinks": {}
      }
    };
    db.songs.push(s2);

    const s3 = {
      "id": generateNextSongId(),
      "rank": 5,
      "title": {
        "jp": "true my heart",
        "en": "true my heart",
        "kr": "true my heart"
      },
      "artistTagIds": [[addTag("Sakura Saori", "artist")]],
      "producerTagIds": [[addTag("ave;new", "producer")]],
      "genreTagIds": [
        [addTag("denpa song", "genre")],
        [addTag("character song", "genre")],
      ],
      "mediaTagIds": [
        [addTag("Nursery Rhyme", "media")],
        [addTag("Saekano", "media")],
      ],
      "coverTagIds": [],
      "link": {
        "artistLinks": {
          "Sakura Saori": {
            "youtube": "",
            "niconico": "",
            "bilibili": ""
          }
        },
        "coverLinks": {}
      }
    };
    db.songs.push(s3);

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
