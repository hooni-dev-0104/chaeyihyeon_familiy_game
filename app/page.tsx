import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            가족 게임 플랫폼
          </h1>
          <p className="text-gray-600 text-lg">
            이현이네와 채이네 가족이 함께하는 즐거운 게임 시간 🎮
          </p>
        </div>

        <div className="space-y-4 pt-8">
          <Link
            href="/auth/login"
            className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            로그인
          </Link>
          <Link
            href="/auth/signup"
            className="block w-full bg-white text-indigo-600 py-4 px-6 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg border-2 border-indigo-200 transform hover:scale-105 transition-all duration-200"
          >
            회원가입
          </Link>
        </div>

        <div className="pt-8 text-sm text-gray-500">
          <p>라이어 게임 | 마피아 게임</p>
        </div>
      </div>
    </div>
  );
}

