# 우주 음악 메타버스

행성 사이를 이동하며 음악을 감상하는 초등 음악 수업용 2D 메타버스 웹앱입니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열어주세요.

## 현재 구현 상태

- 교사 세션 생성
- 학생 세션코드/이름 입장
- Phaser 기반 2D 우주 공간
- 학생 입장 전 캐릭터 선택
- 행성별 MP3 재생/정지
- 학생 이름표와 위치 표시
- 세션 채팅
- 기본 비속어 필터
- Firebase Realtime Database 연결을 위한 클라이언트 설정과 보안 규칙 초안

## 문서

- [프로젝트 진행 기록](docs/PROJECT_PROGRESS.md)
- [구현 계획](docs/IMPLEMENTATION_PLAN.md)
- [캐릭터 아바타 계획](docs/CHARACTER_AVATAR_PLAN.md)
- [에셋 출처](docs/ASSET_CREDITS.md)
- [행성 이미지 출처](docs/PLANET_IMAGE_SOURCES.md)

## 로컬 데모 방식

현재 MVP는 Firebase 프로젝트 없이도 체험할 수 있도록 Next.js Route Handler와 서버 메모리 저장소를 사용합니다. 개발 서버를 재시작하면 생성된 세션과 채팅 기록은 초기화됩니다.

## Firebase 연결

`.env.example`을 참고해 `.env.local`을 만들고 값을 채워주세요.

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Firebase Console에서 Authentication의 Google 로그인과 익명 로그인을 켜고,
Realtime Database를 만든 뒤 [firebase/database.rules.json](/Users/kimhongnyeon/Dev/codex/universe-metaverse/firebase/database.rules.json)
규칙을 적용해주세요.

## 음원

제공된 MP3는 브라우저용 경로로 복사되어 있습니다.

- `public/audio/mars.mp3`
- `public/audio/venus.mp3`
- `public/audio/mercury.mp3`
- `public/audio/jupiter.mp3`
- `public/audio/saturn.mp3`
- `public/audio/uranus.mp3`
- `public/audio/neptune.mp3`
- `public/audio/earth-blue-sea.mp3`
- `public/audio/polar-bear.mp3`

실제 외부 배포 전에는 음원 사용 권한을 확인해 주세요.

## 캐릭터 에셋

학생 캐릭터는 Kenney의 Toon Characters 중 5개를 사용합니다. 공식 페이지에서 Creative Commons CC0로 제공되는 에셋입니다.

- 출처: https://www.kenney.nl/assets/toon-characters
- 라이선스: Creative Commons CC0
- 앱 경로: `public/characters`
