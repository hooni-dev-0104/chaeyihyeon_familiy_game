# 배포 가이드

## 빌드 완료 ✅

프로젝트가 성공적으로 빌드되었습니다!

```bash
npm run build
```

## Vercel 배포 단계

### 1. GitHub에 푸시

```bash
git add .
git commit -m "Complete family game platform"
git push origin main
```

### 2. Vercel 배포

1. https://vercel.com 접속 및 로그인
2. "Add New" > "Project" 클릭
3. GitHub 저장소 선택 (`chaeyihyeon_familiy_game`)
4. "Import" 클릭

### 3. 환경 변수 설정

Vercel 프로젝트 설정에서 다음 환경 변수를 추가하세요:

```
NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
GEMINI_API_KEY=your_actual_gemini_api_key
```

### 4. 배포

"Deploy" 버튼을 클릭하면 자동으로 빌드 및 배포됩니다!

## 배포 후 확인 사항

### ✅ 체크리스트

- [ ] Supabase 프로젝트 생성 완료
- [ ] Supabase 데이터베이스 스키마 실행 완료 (`supabase/schema.sql`)
- [ ] Supabase Realtime 활성화 (rooms, room_players, game_sessions 테이블)
- [ ] Gemini API 키 발급 완료
- [ ] Vercel 환경 변수 설정 완료
- [ ] 배포 성공 확인

### 배포 후 테스트

1. 배포된 URL 접속
2. 회원가입 테스트
3. 로그인 테스트
4. 방 생성 테스트
5. 게임 플레이 테스트

## 모바일에서 PWA 설치

### iOS (Safari)
1. 배포된 URL을 Safari에서 열기
2. 하단 공유 버튼 클릭
3. "홈 화면에 추가" 선택
4. "추가" 클릭

### Android (Chrome)
1. 배포된 URL을 Chrome에서 열기
2. 메뉴 (⋮) 클릭
3. "홈 화면에 추가" 선택
4. "설치" 클릭

## 문제 해결

### 빌드 에러
```bash
# 로컬에서 빌드 테스트
npm run build

# 캐시 삭제 후 재빌드
rm -rf .next node_modules
npm install
npm run build
```

### Supabase 연결 에러
- 환경 변수가 올바르게 설정되었는지 확인
- Supabase 프로젝트가 활성 상태인지 확인
- API 키가 유효한지 확인

### Realtime 작동 안함
- Supabase 대시보드에서 Realtime 활성화 확인
- RLS (Row Level Security) 정책 확인
- 브라우저 콘솔에서 에러 메시지 확인

## 성능 최적화

### 이미지 최적화
- 아이콘 파일 추가 (192x192, 512x512)
- `public/icon-192.png` 
- `public/icon-512.png`

### 캐싱 전략
- Vercel의 기본 캐싱 활용
- Static 페이지는 자동으로 CDN에 캐시됨

## 모니터링

### Vercel Analytics
- Vercel 대시보드에서 자동으로 트래픽 모니터링

### Supabase Monitoring
- Supabase 대시보드에서 데이터베이스 성능 확인
- API 요청 수 모니터링

## 비용 관리

### 무료 티어 한도

**Vercel**
- 무제한 배포
- 100GB 대역폭/월
- 기본 성능으로 충분

**Supabase**
- 500MB 데이터베이스
- 50,000 월간 활성 사용자
- 2GB 파일 저장소

**Google Gemini**
- 무료 티어: 60 requests/minute
- 마피아 게임 진행에 충분

## 업데이트

코드 변경 후:

```bash
git add .
git commit -m "Update: [변경 내용]"
git push origin main
```

Vercel이 자동으로 새로운 버전을 배포합니다!

