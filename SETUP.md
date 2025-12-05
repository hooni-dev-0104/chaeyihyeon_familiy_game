# 가족 게임 플랫폼 설정 가이드

## 1. Supabase 프로젝트 설정

### 1.1 Supabase 프로젝트 생성
1. https://supabase.com 접속
2. "New Project" 클릭
3. 프로젝트 이름: `family-game-platform`
4. Database Password 설정 (안전한 곳에 저장)
5. Region: `Northeast Asia (Seoul)` 선택
6. "Create new project" 클릭

### 1.2 데이터베이스 스키마 설정
1. Supabase 대시보드에서 왼쪽 메뉴의 "SQL Editor" 클릭
2. "New query" 클릭
3. `supabase/schema.sql` 파일의 내용을 복사하여 붙여넣기
4. "Run" 버튼 클릭하여 실행

### 1.3 API 키 확인
1. Supabase 대시보드에서 "Settings" > "API" 클릭
2. `Project URL`과 `anon public` 키 복사

## 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 2.1 Gemini API 키 발급
1. https://makersuite.google.com/app/apikey 접속
2. Google 계정으로 로그인
3. "Create API Key" 클릭
4. 생성된 API 키를 `.env.local`에 추가

## 3. 로컬 개발 서버 실행

```bash
# 의존성 설치 (이미 완료된 경우 생략)
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 4. Vercel 배포

### 4.1 Vercel 프로젝트 연결
1. https://vercel.com 접속 후 로그인
2. "Add New" > "Project" 클릭
3. GitHub 저장소 선택
4. "Import" 클릭

### 4.2 환경 변수 설정
1. "Environment Variables" 섹션에서 다음 변수 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
2. "Deploy" 클릭

## 5. Supabase Realtime 활성화

1. Supabase 대시보드에서 "Database" > "Replication" 클릭
2. 다음 테이블에 대해 Realtime 활성화:
   - `rooms`
   - `room_players`
   - `game_sessions`

## 6. 모바일에서 테스트

### PWA 설치 (옵션)
1. 스마트폰 브라우저에서 배포된 URL 접속
2. Safari (iOS): 공유 > 홈 화면에 추가
3. Chrome (Android): 메뉴 > 홈 화면에 추가

## 문제 해결

### Supabase 연결 오류
- `.env.local` 파일의 환경 변수가 올바른지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- 브라우저 콘솔에서 에러 메시지 확인

### Realtime 업데이트가 작동하지 않음
- Supabase Realtime이 활성화되어 있는지 확인
- RLS (Row Level Security) 정책이 올바른지 확인

### 게임이 시작되지 않음
- Gemini API 키가 올바른지 확인
- API 할당량을 확인
- 네트워크 연결 상태 확인

