import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-sm space-y-natural-lg">
        {/* 타이틀 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            가족 게임방
          </h1>
          <p className="text-base text-gray-600">
            이현이네 × 채이네
          </p>
        </div>

        {/* 게임 소개 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-5 text-center">
            <div className="text-3xl mb-2">🎭</div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">라이어 게임</h3>
            <p className="text-xs text-gray-500">숨은 라이어 찾기</p>
          </div>
          <div className="card p-5 text-center">
            <div className="text-3xl mb-2">🔪</div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">마피아 게임</h3>
            <p className="text-xs text-gray-500">AI 사회자와 함께</p>
          </div>
        </div>

        {/* 버튼 */}
        <div className="space-y-natural-sm">
          <Link
            href="/auth/login"
            className="btn btn-primary w-full no-select"
          >
            게임 시작하기
          </Link>
          <Link
            href="/auth/signup"
            className="btn btn-secondary w-full no-select"
          >
            회원가입
          </Link>
        </div>

        {/* 하단 정보 */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-xs text-gray-500">3-12명이 함께 즐기는 게임</p>
          <p className="text-xs text-gray-400">모바일에서도 편하게!</p>
        </div>
      </div>
    </div>
  );
}
