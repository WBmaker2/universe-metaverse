# 우주 음악 메타버스 프로젝트 진행 기록

작성일: 2026-04-23  
저장소: https://github.com/WBmaker2/universe-metaverse.git  
운영 배포: https://universe-metaverse.vercel.app  
최신 확인 커밋: `1239d3d Add tablet joystick controls`

## 1. 프로젝트 목표

교사가 Google 로그인으로 수업 세션을 만들고, 학생은 세션코드와 이름으로 입장해 2D 우주 공간에서 행성별 음악을 감상하는 교육용 웹앱을 만드는 것이 목표입니다.

학생은 메타버스 안에서 서로의 이름과 캐릭터를 볼 수 있고, 채팅으로 감상을 나눌 수 있습니다. 행성 가까이 접근하거나 행성을 클릭하면 해당 행성의 음악이 재생되고, 멀어지면 음악이 정지됩니다.

## 2. 초기 판단과 구현 방향

초기 검토에서 2D 기반 메타버스가 MVP에 가장 적합하다고 판단했습니다.

- 3D보다 기기 부담이 낮고, 학교 태블릿/노트북에서 안정적으로 실행하기 쉽습니다.
- Phaser를 사용하면 2D 월드, 카메라, 입력, 캐릭터, 행성 배치를 빠르게 구현할 수 있습니다.
- React/Next.js는 교사 콘솔, 학생 입장, 채팅, 현재 감상 상태 같은 DOM UI에 적합합니다.
- Firebase Realtime Database를 연결하면 여러 반/여러 기기에서 세션, 채팅, 위치 상태를 안정적으로 공유할 수 있습니다.

초기 계획은 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)에 기록했습니다.

## 3. 현재 기술 스택

- 프레임워크: Next.js, React, TypeScript
- 2D 메타버스 엔진: Phaser
- 실시간 운영 상태: Firebase Auth, Firebase Realtime Database
- 로컬 데모 상태: Next.js Route Handler + 서버 메모리 저장소
- 배포: Vercel
- 음원 배포: production 기본값은 jsDelivr CDN 경로 사용
- QR 생성: `qrcode`
- 브라우저 검증: Playwright

## 4. 주요 구현 과정

### 4.1 MVP 구현

첫 MVP에서는 교사 세션 생성, 학생 입장, Phaser 기반 우주 공간, 행성별 음악 재생, 참가자 표시, 채팅, 기본 비속어 필터를 구현했습니다.

주요 커밋:

- `017ccc3 Initial universe music metaverse MVP`

구현된 흐름:

1. 교사가 수업 이름과 표시 이름을 입력해 6자리 세션코드를 생성합니다.
2. 학생은 세션코드와 이름을 입력해 입장합니다.
3. 학생은 우주 공간에서 방향키, WASD, 클릭/터치로 이동합니다.
4. 행성 접근 또는 클릭 시 음악이 재생됩니다.
5. 채팅 메시지는 기본 필터를 통과한 경우에만 표시됩니다.

### 4.2 음원 최적화와 배포 안정화

배포 용량을 줄이기 위해 MP3 파일을 압축했고, Vercel 배포 시 불필요한 로컬 산출물이 올라가지 않도록 정리했습니다. production 환경에서는 GitHub public 파일을 jsDelivr CDN으로 불러오도록 오디오 기본 경로를 조정했습니다.

주요 커밋:

- `8cf9227 Compress audio assets and stabilize session API`
- `33312b4 Further reduce audio size for deployment`
- `30f73e2 Serve production audio from CDN`
- `9945a3e Exclude local deploy artifacts from Vercel uploads`
- `95c1153 Ignore build outputs in Vercel deploys`

### 4.3 행성 클릭/감상 상태와 위치 보정

행성을 클릭했을 때 화면 좌표와 월드 좌표가 어긋나는 문제를 수정했습니다. 클릭한 행성으로 이동하는 중에도 감상 상태가 유지되도록 보정했고, Phaser 씬이 로딩된 뒤 스모크 테스트가 진행되도록 테스트 안정성도 높였습니다.

주요 커밋:

- `4fabd93 Keep clicked planet selected while approaching`
- `ef2429d Detect planet clicks from world coordinates`
- `42e00e9 Wait for Phaser scene in smoke test`

### 4.4 실제 행성 이미지와 말풍선 채팅

기존 단순 그래픽 행성을 NASA/NASA Science 기반 실제 천체 이미지로 교체했습니다. 수성, 금성, 지구, 화성, 목성, 토성, 천왕성, 해왕성 이미지를 `public/images/planets`에 배치하고, 출처는 [PLANET_IMAGE_SOURCES.md](./PLANET_IMAGE_SOURCES.md)에 기록했습니다.

학생이 채팅을 입력하면 오른쪽 채팅창에 표시될 뿐 아니라, 메타버스 안의 캐릭터 위에도 말풍선이 약 5초 동안 나타나도록 구현했습니다.

주요 커밋:

- `a0373e9 Add planet photos and chat bubbles`

### 4.5 캐릭터 선택 기능

학생이 입장 전에 캐릭터를 선택하고, 메타버스 안에서 해당 캐릭터로 보이도록 구현했습니다. 에셋은 Kenney Toon Characters를 사용했습니다. 해당 에셋은 CC0 라이선스로 제공되며, 출처는 [ASSET_CREDITS.md](./ASSET_CREDITS.md)에 기록했습니다.

관련 계획:

- [CHARACTER_AVATAR_PLAN.md](./CHARACTER_AVATAR_PLAN.md)

구현 내용:

- 입장 화면 캐릭터 선택 그리드
- 참가자 데이터의 `avatarId`
- 로컬 API와 Firebase 참가자 상태에 캐릭터 정보 저장
- Phaser에서 원형 아바타 대신 캐릭터 스프라이트 표시
- 다른 학생도 각자 선택한 캐릭터로 표시

### 4.6 Firebase 운영 모드 전환

여러 반과 여러 기기에서 더 안정적으로 쓰기 위해 Firebase Realtime Database 기반 구조로 전환했습니다.

구현 내용:

- Firebase 클라이언트 설정
- 교사용 Google 로그인
- 학생용 익명 인증
- 세션, 참가자, 채팅 상태를 Realtime Database에 저장
- 위치 업데이트는 약 1초 단위로 전송
- 화면에서는 보간을 통해 다른 학생의 움직임을 부드럽게 표시
- Firebase 보안 규칙 초안 작성: [database.rules.json](../firebase/database.rules.json)

주요 커밋:

- `af3fff6 Add Firebase realtime room sync`
- `0bf1253 Add Firebase project config`
- `d2fb49e Restrict session creation to Google teachers`
- `63c36dd Fix Firebase session permission flow`

### 4.7 채팅창 높이 문제 수정

채팅 메시지가 누적될 때 채팅창 자체가 계속 길어지는 문제가 있었습니다. 채팅 패널은 고정 높이를 유지하고, 메시지 목록만 내부 스크롤되도록 CSS 구조를 수정했습니다. 새 메시지가 들어오면 목록 하단으로 자동 스크롤되도록 유지했습니다.

주요 커밋:

- `7deac68 Fix chat panel scrolling`

### 4.8 QR 입장 기능

교사용 세션 화면에서 학생 입장 URL을 QR코드로 자동 생성하도록 구현했습니다. 기존 세션코드는 계속 크게 보이게 하고, QR은 코드 아래에 배치했습니다. `QR 크게 보기` 버튼을 누르면 별도 창에 큰 QR, 세션코드, 입장 링크, 인쇄 버튼이 표시됩니다.

주요 커밋:

- `b899c72 Add QR sharing for class sessions`

검증 내용:

- 교사 세션 생성 후 QR data URL 생성 확인
- 데스크톱/모바일에서 세션코드와 QR이 화면 밖으로 밀리지 않는지 확인
- `QR 크게 보기` 팝업에서 코드와 QR 렌더링 확인

### 4.9 태블릿 조이스틱과 반응형 채팅 UI

태블릿처럼 물리 키보드가 없는 환경을 위해 터치 기기에서만 보이는 가상 조이스틱을 추가했습니다. 조이스틱 입력은 기존 키보드 이동과 같은 Phaser 이동 로직으로 처리됩니다.

또한 태블릿 화면에서 채팅 입력이 가상 키보드에 가려지지 않도록, 채팅 입력창 포커스 시 화면 안으로 보정하고, 터치 입력용 버튼 크기를 키웠습니다.

주요 커밋:

- `1239d3d Add tablet joystick controls`

검증 내용:

- 태블릿 크기 Playwright 테스트에서 조이스틱 표시 확인
- 조이스틱 드래그로 참가자 위치가 이동하는지 확인
- 채팅 패널 높이 유지 확인
- 메시지 목록 내부 스크롤과 최신 메시지 하단 표시 확인
- 데스크톱에서는 조이스틱이 숨겨지고 기존 2열 레이아웃이 유지되는지 확인

## 5. 오류와 대응 기록

### Phaser 런타임 로딩 오류

`Cannot read properties of undefined (reading 'Scene')` 오류가 발생했습니다. Next.js 클라이언트 환경에서 Phaser 모듈을 안전하게 동적 import하고, default export 여부를 보정하는 방식으로 처리했습니다.

### Hydration mismatch

클라이언트 저장소와 브라우저 전용 값이 서버 렌더링 결과와 달라져 hydration 경고가 발생했습니다. 브라우저에서만 필요한 입장 정보 확인은 클라이언트 렌더 이후 진행되도록 정리했습니다.

### 채팅 시 "세션을 찾을 수 없습니다"

로컬 데모 모드와 Firebase 운영 모드의 세션 상태 보존 방식 차이 때문에 채팅 요청에서 세션 복구가 필요한 경우가 있었습니다. 로컬 API의 요청 구조와 recovery state 처리를 안정화했습니다.

### 이동 방향 반대 튕김

위치 동기화를 너무 자주 보내거나 원격 상태가 로컬 움직임을 덮어쓸 때 튕김처럼 보일 수 있었습니다. 위치 전송 주기를 약 1초로 줄이고, 원격 참가자는 보간으로 표시하도록 조정했습니다.

### Firebase permission denied

교사 세션 생성 시 Firebase 보안 규칙과 인증 흐름이 맞지 않아 permission denied가 발생했습니다. 교사 Google 인증, 세션 write 규칙, 참가자/메시지 write 규칙을 맞춰 수정했습니다.

### 채팅창이 계속 길어지는 문제

채팅 메시지 목록이 패널 전체 높이를 밀어내는 구조였습니다. 패널은 고정 높이를 유지하고 메시지 목록만 `overflow: auto`가 되도록 수정했습니다.

## 6. 현재 구현 상태

현재 앱은 다음 기능을 제공합니다.

- 교사용 Google 로그인
- 교사용 세션 생성
- 학생 입장 코드와 입장 URL 표시
- QR코드 자동 생성과 큰 QR 팝업
- 학생 세션코드/이름 입장
- 입장 전 캐릭터 선택
- 2D 우주 메타버스 공간
- 수성, 금성, 지구, 화성, 목성, 토성, 천왕성, 해왕성 배치
- 실제 천체 관측/우주 이미지 기반 행성 그래픽
- 행성별 음악 재생과 거리 기반 정지
- 같은 세션 학생 이름표/캐릭터 표시
- 위치 동기화와 부드러운 보간
- 채팅 패널
- 캐릭터 위 말풍선 채팅
- 기본 비속어 필터
- 태블릿용 가상 조이스틱
- 태블릿/모바일 대응 채팅 UI
- Firebase Realtime Database 기반 운영 상태
- Firebase 미연결 시 로컬 데모 세션 fallback

## 7. 배포 기록

GitHub main 브랜치 push를 통해 Vercel production 배포가 자동으로 진행됩니다.

최신 배포 확인:

- 배포 URL: https://universe-metaverse.vercel.app
- 최신 production deployment: `universe-metaverse-rekioxl5q-wbmaker2s-projects.vercel.app`
- 상태: Ready
- 확인 시각: 2026-04-23 23:41 KST 이후

## 8. 검증 기록

반복적으로 사용한 검증 명령:

```bash
npm run lint
npm run build
npm run test:smoke
```

추가로 Playwright 기반 수동 스모크 테스트를 실행했습니다.

- 교사 세션 생성
- 학생 입장
- 캐릭터 선택 저장
- Phaser 캔버스 렌더링
- 행성 클릭 후 감상 상태 변경
- 채팅 전송과 말풍선 표시
- QR 생성과 큰 QR 팝업
- 태블릿 조이스틱 이동
- 태블릿 채팅창 내부 스크롤
- 데스크톱 레이아웃 회귀 확인

## 9. 운영 시 주의사항

- 실제 수업 전 Firebase Console에서 Google 로그인, 익명 로그인, Realtime Database가 활성화되어 있어야 합니다.
- Vercel 환경변수에는 `.env.example`의 Firebase 값이 등록되어 있어야 합니다.
- Firebase 보안 규칙은 현재 수업용 MVP 기준입니다. 학교 현장 사용 전에는 만료 세션 정리, 교사별 세션 관리, 메시지 신고/삭제 같은 운영 정책을 추가 검토하는 것이 좋습니다.
- 제공된 MP3 음원은 교육용 사용 권한을 별도로 확인해야 합니다.
- NASA 이미지는 교육/정보 목적 사용이 가능하지만, NASA 보증처럼 보이지 않도록 출처 표기와 표현에 유의해야 합니다.
- 학생 개인정보는 최소화되어 있으며, 현재 학생은 이름과 익명 인증으로만 참여합니다.

## 10. 다음 개선 후보

1. 교사용 실시간 학생 목록과 강제 퇴장/채팅 숨김 기능
2. 세션 종료 버튼과 만료 세션 자동 정리
3. 교사용 QR 인쇄 전용 화면 개선
4. 행성별 감상 활동지 또는 질문 카드
5. 학생별 감상 로그 저장과 수업 후 요약
6. 더 정교한 비속어/부적절 표현 필터
7. Firebase 보안 규칙 테스트 자동화
8. 실제 학교 태블릿 브라우저에서 현장 부하 테스트
