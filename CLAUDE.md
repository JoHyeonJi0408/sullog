# 술로그 — 작업 안내

술(와인·위스키·사케·막걸리·맥주·소주·전통주·데킬라 등) 정보와 테이스팅 노트를 기록하는 개인용 앱.
**claude.ai 아티팩트**로 배포되어 있고, 이 저장소는 그 소스다.

- 아티팩트 주소: https://claude.ai/artifact/SVnKrqCjTcnFsC5fFfdQbt (같은 주소에 계속 덮어써서 업데이트)
- 사용자는 단순함을 원한다: 술 정보 + 테이스팅 노트 + 사진/바코드 자동 입력. 기능을 늘리기보다 쓰기 쉽게.
- 화면 문구와 주석은 한국어.

## 구조

- React 18 + TypeScript + Vite. 빌드 결과를 HTML 한 장으로 합쳐 아티팩트로 올린다.
- `src/repo.ts` — 데이터 읽기/쓰기는 전부 여기. 아티팩트 `db` 기능 사용.
  - 기록 위치: `data/users/<내 id>/profile` 아래 `drinks`, `tastings` 컬렉션 (본인만 볼 수 있는 공간)
  - 사진: 아티팩트 `assets`에 원본(1600px)·썸네일(320px) 두 장 업로드, id를 `photoId`/`thumbId`로 저장
- `src/lib/claude.ts` — `window.claude.use(...)` 런타임 접근과 최소 타입
- `src/lib/ai.ts` — 라벨 사진 → 술 정보. `sample.json`(보는 사람의 Claude 구독 사용량)으로 호출, API 키 없음
- `src/lib/barcode.ts` — 기기에서 바코드 해독(zxing wasm). 실패하면 `ai.ts`의 Claude 읽기로 대체
- `src/vocab.ts` — 테이스팅 선택지(술 종류별 향 태그, 맛 느낌, 여운, 음식, 맛의 세기 축)
- `src/components/icons.tsx`(술 종류 아이콘), `tagIcons.tsx`(태그 아이콘), `TastingFields.tsx`(노트 입력)
- `src/router.ts` — 앱 안에서만 쓰는 화면 이동(아티팩트 주소창에는 경로를 남기지 않음)
- `src/dev-mock.ts` — `npm run dev`에서만 붙는 가짜 claude 런타임(db/assets/sample/user/downloads). 빌드에는 안 들어감
- `src/styles.css` — 디자인 토큰(`:root`), 라이트/다크(`prefers-color-scheme` + `data-theme`) 모두 정의

## 개발과 배포

```bash
npm install
npm run dev     # http://localhost:5173 — 가짜 런타임으로 화면 흐름 확인
npm run build   # artifact/sullog.html + artifact/zxing_reader.wasm 생성
```

배포(Claude Code의 Artifact 도구):
- 다른 대화에서 이어서 할 때는 먼저 `action: "read"`, `url`: 위 아티팩트 주소로 읽은 뒤 publish
- `file_path`: `artifact/sullog.html`, `url`: 위 아티팩트 주소
- `files`: `{"zxing_reader.wasm": {"from": "artifact/zxing_reader.wasm", "contentType": "application/wasm"}}` (wasm을 바꿨을 때만 필요)
- `capabilities`는 생략하면 기존 선언이 유지된다. 바꿀 때는 전체를 다시 선언:
  `{"db": {}, "user": {}, "assets": {}, "sample": {"images": true}, "downloads": true}`

## 아티팩트 제약 (지키지 않으면 조용히 깨짐)

- `alert`/`confirm`/`prompt`는 동작하지 않는다 → 페이지 안 확인 UI(`ConfirmButton`, `Toast`)
- 외부 스크립트는 허용된 CDN만, 스타일시트는 Google Fonts만(현재 Jua, Gowun Dodum). 나머지는 인라인
- `<a download>` 같은 직접 다운로드 불가 → `downloads` 기능 사용(설정 화면의 백업 내보내기)
- 사진은 `<input type=file>`로만 받는다(카메라 API 직접 사용 불가)
- 쓰기는 문서당 한 번에 하나, 사용자 동작에서만. Claude 호출(`sample`)도 버튼/사진 선택 같은 동작에서만

## Git

- 원격: github.com/JoHyeonJi0408/sullog. 이 Mac의 `gh` 기본 계정이 다른 계정일 수 있으니, push할 때 `gh auth switch --user JoHyeonJi0408` 후 push, 끝나면 원래 계정으로 되돌린다.
- 예전 PWA 버전(GitHub Pages, johyeonji0408.github.io/sullog)은 더 이상 갱신하지 않는다.
