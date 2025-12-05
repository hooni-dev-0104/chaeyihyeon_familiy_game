import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f0f23] bg-pattern flex flex-col items-center justify-center p-4">
      {/* 메인 컨텐츠 */}
      <div className="w-full max-w-lg space-y-8 animate-fade-in">
        {/* 로고 영역 */}
        <div className="text-center space-y-4">
          <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-[#e94560]/20 to-[#0f3460]/20 border border-[#e94560]/30">
            <svg className="w-16 h-16 mx-auto text-[#e94560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Family<span className="text-[#e94560]">Game</span>
          </h1>
          <p className="text-[#a0aec0] text-lg">
            이현이네 × 채이네 가족 게임
          </p>
        </div>

        {/* 게임 카드 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="game-card rounded-2xl p-5 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-white mb-1">라이어 게임</h3>
            <p className="text-xs text-[#a0aec0]">숨은 라이어를 찾아라!</p>
          </div>

          <div className="game-card rounded-2xl p-5 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-white mb-1">마피아 게임</h3>
            <p className="text-xs text-[#a0aec0]">AI 사회자와 함께!</p>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="btn-primary block w-full py-4 px-6 rounded-xl text-center text-lg glow-red animate-pulse-glow"
          >
            게임 시작하기
          </Link>
          <Link
            href="/auth/signup"
            className="btn-secondary block w-full py-4 px-6 rounded-xl text-center text-lg"
          >
            회원가입
          </Link>
        </div>

        {/* 하단 정보 */}
        <div className="flex justify-center gap-6 text-sm text-[#a0aec0]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>3-12명</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>모바일 최적화</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>실시간</span>
          </div>
        </div>
      </div>
    </div>
  );
}
