"use client";

import { useEffect, useMemo, useState } from "react";

export default function OpenInBrowserPage({ searchParams }: { searchParams?: Record<string,string|undefined> }) {
  const to = useMemo(() => searchParams?.to || "/", [searchParams?.to]);

  // 최종 이동할 절대 URL
  const fullUrl = useMemo(() => {
    if (typeof window === "undefined") return to;
    const origin = window.location.origin;
    return to.startsWith("http") ? to : `${origin}${to}`;
  }, [to]);

  useEffect(() => {
    const ua = (navigator.userAgent || "").toLowerCase();
    const isAndroid = ua.includes("android");
    const isIOS = /iphone|ipad|ipod/.test(ua);

    // 인앱(WebView) 추정: 대표 패턴들
    const inApp =
      ua.includes("kakaotalk") || ua.includes("instagram") || ua.includes("fbav") || ua.includes("fban") ||
      ua.includes("naver(inapp") || ua.includes("naverapp") || ua.includes("line/") ||
      ua.includes("; wv") || ua.includes(" version/") || ua.includes("twitter") || ua.includes("snapchat");

    if (inApp) {
      // 외부 브라우저 열기 시도
      if (isAndroid) {
        const hostPath = fullUrl.replace(/^https?:\/\//, "");
        window.location.href = `intent://${hostPath}#Intent;scheme=https;package=com.android.chrome;end`;
      } else if (isIOS) {
        const noProto = fullUrl.replace(/^https?:\/\//, "");
        const scheme = fullUrl.startsWith("https://") ? "googlechromes://" : "googlechrome://";
        window.location.href = `${scheme}${noProto}`;
        // iOS는 실패할 수도 있어 아래 안내 UI가 남아있게 둠
      } else {
        window.open(fullUrl, "_blank", "noopener,noreferrer");
      }
    } else {
      // 일반 브라우저면 바로 통과
      window.location.replace(fullUrl);
    }
  }, [fullUrl]);

  const [copied, setCopied] = useState(false);

  return (
    <main className="min-h-[60vh] grid place-items-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-lg font-bold">브라우저에서 열기</h1>
        <p className="text-sm text-gray-600 mt-2">
          앱 내부에서는 Google 로그인이 제한될 수 있어요. 브라우저에서 다시 열어 진행해 주세요.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <a
            href={fullUrl}
            className="rounded-md px-4 py-2 bg-black text-white"
          >
            계속하기
          </a>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(fullUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
            }}
            className="rounded-md px-4 py-2 border"
          >
            {copied ? "복사됨!" : "링크 복사"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3 break-all">{fullUrl}</p>
      </div>
    </main>
  );
}
