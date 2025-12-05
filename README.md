# 가족 게임 플랫폼 🎮

이현이네와 채이네 가족이 함께 즐기는 온라인 멀티플레이어 게임 플랫폼입니다.

## 게임 종류

### 🎭 라이어 게임
- 한 명의 라이어를 제외한 모든 플레이어에게 같은 제시어가 주어집니다
- 라이어는 카테고리만 알 수 있습니다
- 각자 돌아가며 힌트를 제시하고 투표로 라이어를 찾아내세요!

### 🔪 마피아 게임
- AI 사회자가 진행하는 본격 마피아 게임
- 마피아, 시민, 의사, 경찰의 역할로 플레이
- 밤과 낮을 반복하며 마피아를 찾아내거나 시민을 제거하세요

## 주요 기능

- ✅ 간편한 회원가입 및 로그인 (Supabase Auth)
- ✅ 실시간 방 생성 및 참가 시스템
- ✅ 모바일 최적화된 반응형 UI
- ✅ PWA 지원으로 앱처럼 사용 가능
- ✅ Supabase Realtime으로 실시간 동기화
- ✅ Google Gemini AI 사회자 (마피아 게임)

## 기술 스택

- **Frontend**: Next.js 15, TypeScript, TailwindCSS
- **Backend/Database**: Supabase (PostgreSQL, Realtime, Auth)
- **AI**: Google Gemini API
- **Deployment**: Vercel

## 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/hooni-dev-0104/chaeyihyeon_familiy_game.git
cd chaeyihyeon_familiy_game
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 입력하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

자세한 설정 방법은 [SETUP.md](./SETUP.md)를 참조하세요.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열어보세요!

## Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 파일 실행
3. Settings > API에서 URL과 anon key 복사
4. `.env.local` 파일에 추가

## Gemini API 키 발급

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. API 키 생성
3. `.env.local` 파일에 추가

## 배포

### Vercel 배포

1. GitHub에 저장소 푸시
2. [Vercel](https://vercel.com)에서 프로젝트 import
3. 환경 변수 설정
4. Deploy!

자세한 배포 가이드는 [SETUP.md](./SETUP.md)를 참조하세요.

## 프로젝트 구조

```
/app
  /api          # API 라우트 (AI 메시지 생성)
  /auth         # 인증 페이지 (로그인, 회원가입)
  /lobby        # 대기실
  /room/[id]    # 게임 방
  /game         # 게임 페이지
    /liar       # 라이어 게임
    /mafia      # 마피아 게임
/components     # 재사용 가능한 컴포넌트
/lib            # 유틸리티 함수
  /supabase     # Supabase 클라이언트
  /game-logic   # 게임 로직
  /ai           # AI 통합
/types          # TypeScript 타입 정의
```

## 모바일 최적화

- 📱 모바일 퍼스트 디자인
- 👆 터치 최적화된 인터페이스
- 📲 PWA 지원 (홈 화면에 추가 가능)
- 🎨 반응형 레이아웃

## 라이선스

MIT

## 만든 사람

이현이네와 채이네 가족을 위한 특별한 게임 플랫폼 ❤️

