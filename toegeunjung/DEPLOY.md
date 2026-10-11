# 퇴근중 배포 가이드 (GitHub → Vercel)

빌드 과정이 없는 정적 웹앱이라, 파일을 올리기만 하면 바로 실행돼요.

## 1. GitHub에 올리기
1. github.com 로그인 → 오른쪽 위 **+** → **New repository**
2. Repository name: `toegeunjung` (원하는 이름) · **Public** 또는 Private · **Create repository**
3. 새 저장소 화면에서 **uploading an existing file** 링크(또는 **Add file → Upload files**) 클릭
4. 압축을 푼 `toegeunjung` 폴더 **안의 파일과 폴더 전부**를 끌어다 놓기
   - 꼭 들어가야 하는 것: `index.html`, `community.js`, `game-words.js`, `luck.js`, `village.js`, `sw.js`, `manifest.webmanifest`, `vercel.json`, `images/`, `icons/`
   - 맥에서 점으로 시작하는 파일(`.gitignore`, `.nojekyll`)이 안 보이면 빠져도 괜찮아요
5. 아래 **Commit changes** 클릭
6. 저장소 첫 화면에 `index.html`이 바로 보이면 성공이에요 (폴더 한 겹 안에 들어가 있으면 안 돼요)

## 2. Vercel로 실제 주소 만들기
1. vercel.com → **Sign Up / Log in** → **Continue with GitHub**
2. **Add New… → Project** → 방금 만든 `toegeunjung` 저장소 옆 **Import**
   - 저장소가 안 보이면 **Adjust GitHub App Permissions**에서 저장소 접근을 허용
3. 설정 화면
   - Framework Preset: **Other**
   - Root Directory: `./` (그대로)
   - Build Command / Output Directory / Install Command: **비워 둠** (Override 끄기)
4. **Deploy** → 1분 안에 `https://toegeunjung-xxxx.vercel.app` 주소가 생겨요
5. 휴대폰으로 그 주소를 열고 홈 화면에 추가
   - 아이폰 Safari: 공유 → **홈 화면에 추가**
   - 안드로이드 Chrome: 메뉴 → **앱 설치**

## 3. 수정할 때
- GitHub 저장소에서 파일을 바꿔 올리면 Vercel이 자동으로 다시 배포해요 (보통 1분 이내)
- 이미 설치한 폰에 새 버전이 확실히 뜨게 하려면 `sw.js`의 `VERSION` 값을 올려 주세요 (예: `toegeunjung-v9` → `toegeunjung-v10`)
- 원하는 도메인을 쓰려면 Vercel 프로젝트 → **Settings → Domains**에서 추가

## 4. Vercel에서 되는 것 / 아직 안 되는 것
| 기능 | Vercel 배포 버전 |
|---|---|
| 오늘(출퇴근·미션·급여명세서·시즌), 꾸미기, 오늘의 퇴근각, 돌뽑기(운세·사주·복권) | 그대로 동작 (기록은 각자 폰에 저장) |
| 공유 카드 이미지 저장·공유 | 동작 (Claude 미리보기 페이지와 달리 저장 가능) |
| 홈 화면 설치, 오프라인 실행 | 동작 |
| 동네 마을 걷기·게시판 | 동작하지만 **글이 그 기기에만 저장**돼요 (서버가 없어서) |
| 다른 돌 보이기, 접속자 수, 쪽지, 실제 칼퇴 랭킹 | **서버 연결 후** 열려요 |

다른 사람과 함께 쓰는 기능(게시판 공유, 쪽지, 접속자, 랭킹, 서버 검증 보상)을 Vercel 버전에서 쓰려면 백엔드가 필요해요.
`community.js`의 `makeShared()`와 같은 모양의 저장소를 Supabase·Firebase 같은 서비스로 하나 만들어 끼우면 되도록 코드를 나눠 두었어요.
그 전까지 함께 쓰는 커뮤니티는 Claude에 올린 「퇴근중 앱」 페이지에서 체험할 수 있어요.

## 5. 개인정보
- 생년월일·닉네임·코인·기록은 모두 사용자 폰(브라우저 저장소)에만 저장돼요. 서버로 보내지 않아요.
- 브라우저 데이터를 지우면 기록도 초기화돼요.
