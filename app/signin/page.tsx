// app/signin/page.tsx
"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-gray-100">
      <div className="w-[380px] rounded-2xl bg-white p-6 shadow-md">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">로그인</h1>
          <p className="text-sm text-gray-500 mt-1">회원가입 없이 시작하세요.</p>
        </div>

        {/* Google 버튼 */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/game" })}
          className="relative w-full h-11 rounded-full border border-gray-300 bg-white text-gray-800
                     hover:bg-gray-50 transition-colors"
        >
          {/* 아이콘: 왼쪽 고정 */}
          <span className="absolute left-4 top-1/2 -translate-y-1/2">
            {/* Google G 아이콘 */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.1 29.5 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.8 5 29.7 3 24 3 12.9 3 4 11.9 4 23s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.2-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.7 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.8 5 29.7 3 24 3 16 3 9 7.5 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 43c5.4 0 10.4-2.1 14.1-5.9l-6.5-5.3C29.5 35 26.9 36 24 36c-5.4 0-9.9-3.5-11.6-8.3l-6.6 5.1C8.5 38.8 15.7 43 24 43z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.4 5.8-6.2 7.5l6.5 5.3C38.4 38.4 44 33 44 23c0-1.3-.1-2.5-.4-3.5z"/>
            </svg>
          </span>

          {/* 라벨: 가운데 정렬 */}
          <span className="block text-sm font-medium text-center">Google 로그인</span>
        </button>

        <div className="h-3" />

        {/* Naver 버튼 */}
        <button
          onClick={() => signIn("naver", { callbackUrl: "/game" })}
          className="relative w-full h-11 rounded-full border border-gray-300 bg-white text-gray-800
                     hover:bg-gray-50 transition-colors"
        >
          {/* 왼쪽 네이버 워드마크 */}
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#03C75A] font-extrabold tracking-wider">
            NAVER
          </span>

          {/* 라벨: 가운데 정렬 */}
          <span className="block text-sm font-medium text-center">네이버 로그인</span>
        </button>

        <div className="mt-6 text-center">
          <a href="/game?guest=1" className="text-sm text-blue-600 hover:underline">
            게스트로 체험하기
          </a>
        </div>
      </div>
    </main>
  );
}
