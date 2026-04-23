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
- Supabase 연결을 위한 환경변수와 SQL 스키마 초안

## 로컬 데모 방식

현재 MVP는 Supabase 프로젝트 없이도 체험할 수 있도록 Next.js Route Handler와 서버 메모리 저장소를 사용합니다. 개발 서버를 재시작하면 생성된 세션과 채팅 기록은 초기화됩니다.

## Supabase 연결

`.env.example`을 참고해 `.env.local`을 만들고 값을 채워주세요.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

데이터베이스 스키마 초안은 [supabase/schema.sql](/Users/kimhongnyeon/Dev/codex/universe-metaverse/supabase/schema.sql)에 있습니다.

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
