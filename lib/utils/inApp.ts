// 인앱(WebView) 간단 감지
export function isInAppBrowser(uaRaw?: string) {
  const ua = (uaRaw || (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  if (!ua) return false;
  return (
    ua.includes("kakaotalk") ||
    ua.includes("instagram") || ua.includes("fbav") || ua.includes("fban") ||
    ua.includes("naver(inapp") || ua.includes("naverapp") ||
    ua.includes("line/") ||
    ua.includes("; wv") || ua.includes(" version/") || // 안드로이드 WebView 흔적
    ua.includes("twitter") || ua.includes("snapchat")
  );
}

// 외부 브라우저로 열기 (안드로이드: Chrome Intent, iOS: Chrome 스킴 시도)
export function openExternally(absoluteUrl: string) {
  if (typeof window === "undefined") return;
  const ua = (navigator.userAgent || "").toLowerCase();
  const isAndroid = ua.includes("android");
  const isIOS = /iphone|ipad|ipod/.test(ua);

  if (isAndroid) {
    const hostPath = absoluteUrl.replace(/^https?:\/\//, "");
    window.location.href = `intent://${hostPath}#Intent;scheme=https;package=com.android.chrome;end`;
    return;
  }
  if (isIOS) {
    const noProto = absoluteUrl.replace(/^https?:\/\//, "");
    const scheme = absoluteUrl.startsWith("https://") ? "googlechromes://" : "googlechrome://";
    // 크롬 설치 시 크롬, 미설치면 무시(아래 버튼 기본 동작로 fallback)
    window.location.href = `${scheme}${noProto}`;
    return;
  }
  // 기타 환경: 새 탭
  window.open(absoluteUrl, "_blank", "noopener,noreferrer");
}
