import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-10 left-10 text-6xl animate-float opacity-20">🎮</div>
      <div className="absolute top-20 right-20 text-5xl animate-float opacity-20" style={{ animationDelay: '0.5s' }}>🎲</div>
      <div className="absolute bottom-20 left-20 text-5xl animate-float opacity-20" style={{ animationDelay: '1s' }}>🎯</div>
      <div className="absolute bottom-10 right-10 text-6xl animate-float opacity-20" style={{ animationDelay: '1.5s' }}>🎪</div>
      
      <div className="max-w-md w-full space-y-8 text-center relative z-10">
        {/* 로고/타이틀 */}
        <div className="space-y-4 animate-bounce-subtle">
          <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-indigo-200">
            <div className="text-7xl mb-4">🎉</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
              가족 게임방
            </h1>
            <p className="text-gray-600 text-lg font-medium">
              이현이네 💜 채이네
            </p>
            <p className="text-gray-500 text-sm mt-2">
              함께하는 즐거운 게임 시간!
            </p>
          </div>
        </div>

        {/* 게임 소개 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-blue-200 hover:border-blue-400 transition-all game-card">
            <div className="text-4xl mb-2">🎭</div>
            <p className="font-bold text-blue-600 text-sm">라이어 게임</p>
            <p className="text-xs text-gray-500 mt-1">힌트 주고 라이어 찾기!</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-purple-200 hover:border-purple-400 transition-all game-card">
            <div className="text-4xl mb-2">🔪</div>
            <p className="font-bold text-purple-600 text-sm">마피아 게임</p>
            <p className="text-xs text-gray-500 mt-1">AI 사회자와 함께!</p>
          </div>
        </div>

        {/* 버튼 */}
        <div className="space-y-3 pt-4">
          <Link
            href="/auth/login"
            className="block w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-5 px-6 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-4 border-white btn-pulse"
          >
            <span className="flex items-center justify-center gap-2">
              <span>🎮</span>
              <span>게임 시작하기</span>
            </span>
          </Link>
          <Link
            href="/auth/signup"
            className="block w-full bg-white text-indigo-600 py-4 px-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl border-3 border-indigo-300 transform hover:scale-105 transition-all duration-300"
          >
            <span className="flex items-center justify-center gap-2">
              <span>✨</span>
              <span>새로 시작하기</span>
            </span>
          </Link>
        </div>

        {/* 하단 정보 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 font-medium">
            <span>👥 3-12명</span>
            <span>•</span>
            <span>📱 모바일 최적화</span>
            <span>•</span>
            <span>⚡ 실시간</span>
          </div>
        </div>
      </div>
    </div>
  );
}

