import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* 타이틀 */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-gray-800">
            가족 게임방
          </h1>
          <p className="text-lg text-gray-600">
            이현이네 × 채이네
          </p>
        </div>

        {/* 게임 소개 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-6 text-center">
            <div className="text-4xl mb-3">🎭</div>
            <h3 className="font-bold text-gray-800 mb-1">라이어 게임</h3>
            <p className="text-sm text-gray-600">숨은 라이어 찾기</p>
          </div>
          <div className="card p-6 text-center">
            <div className="text-4xl mb-3">🔪</div>
            <h3 className="font-bold text-gray-800 mb-1">마피아 게임</h3>
            <p className="text-sm text-gray-600">AI 사회자와 함께</p>
          </div>
        </div>

        {/* 버튼 */}
        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="btn btn-primary block w-full py-4 text-center text-lg"
          >
            게임 시작하기
          </Link>
          <Link
            href="/auth/signup"
            className="btn btn-secondary block w-full py-4 text-center text-lg"
          >
            회원가입
          </Link>
        </div>

        {/* 하단 정보 */}
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>3-12명이 함께 즐기는 게임</p>
          <p>모바일에서도 편하게!</p>
        </div>
      </div>
    </div>
  );
}
