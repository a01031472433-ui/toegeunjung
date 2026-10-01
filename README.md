# 🥔 퇴근중

> 출근은 현실, 성장은 게임. 내가 출근해야, 얘도 먹고삽니다.

직장인의 실제 출퇴근을 캐릭터 육성과 연결한 게임 「퇴근중」의 1단계(GAME) 웹앱입니다.
설치나 빌드 없이 GitHub Pages에 올리면 바로 실행되고, 휴대폰 홈 화면에 앱처럼 추가할 수 있습니다.

## 기능
- **오늘**: 출근 → 점심 랜덤 이벤트 → 미션 3개 → 퇴근(급여명세서 + DAY CLEAR), 금요일 월급상자
- **꾸미기**: 옷 8종 · 가구 4종 · 펫 3종 · 집 4단계
- **동네**: 업무지구별 감자 수, 야근중 상태, 응원 보내기 (LOCAL 미리보기 · 예시 수치)
- **서랍**: 회사 주변 맛집 링크, 회사생활 가이드(연차·퇴직금·퇴사 서류 등), 쿠폰함, 체험 모드

## GitHub에 올리는 방법
1. GitHub에서 **New repository** → 이름 예: `toegeunjung` → **Public** 선택 → Create
2. 저장소 화면에서 **Add file → Upload files**
3. 압축을 푼 폴더 **안의 내용 전체**(index.html, images, icons, manifest.webmanifest, sw.js, .nojekyll, README.md)를 끌어다 놓기 → **Commit changes**
   - `.nojekyll`처럼 점으로 시작하는 파일이 안 보이면 없어도 동작합니다.
4. **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / `/ (root)` → Save
5. 1~2분 뒤 `https://<내아이디>.github.io/toegeunjung/` 에서 열립니다.

## 휴대폰에 앱처럼 설치
- 아이폰(Safari): 공유 버튼 → **홈 화면에 추가**
- 안드로이드(Chrome): 메뉴 → **앱 설치** 또는 **홈 화면에 추가**

## 포즈 이미지 추가
`images/poses/` 폴더에 `work.png`, `off.png` 같은 이름으로 PNG를 올리면 자동 반영됩니다. 자세한 규칙은 [images/poses/README.md](images/poses/README.md)를 보세요.

## 업데이트할 때
파일을 바꿔 올린 뒤 `sw.js`의 `VERSION` 값(예: `toegeunjung-v1` → `v2`)을 올려 주면 설치된 앱에도 새 버전이 확실히 반영됩니다.

## 알아둘 점
- 게임 기록은 각 사용자의 브라우저(localStorage)에만 저장됩니다. 기기를 바꾸거나 브라우저 데이터를 지우면 초기화됩니다. 계정·서버 저장은 다음 단계 과제입니다.
- 동네 탭의 인원 수는 예시 수치이고, 커피 쿠폰은 시연용입니다.
- 회사생활 가이드는 일반적인 안내이며 법률 자문이 아닙니다.

## 파일 구조
```
index.html              앱 전체 (HTML·CSS·JS 한 파일)
images/poses/base.png   감자대리 기본 이미지
images/poses/*.png      추가 포즈 (선택)
icons/                  홈 화면 아이콘
manifest.webmanifest    앱 설치 정보
sw.js                   오프라인 캐시
```
