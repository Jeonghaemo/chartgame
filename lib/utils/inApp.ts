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

// 외부 브라우저(가능하면 크롬)로 절대 URL 열기
export function openExternally(absoluteUrl: string) {
  if (typeof window === "undefined") return;
  const ua = (navigator.userAgent || "").toLowerCase();
  const isAndroid = ua.includes("android");
  const isIOS = /iphone|ipad|ipod/.test(ua);

  if (isAndroid) {
    const hostPath = absoluteUrl.replace(/^https?:\/\//, "");
    // 크롬 우선. 크롬 없으면 앱 선택창 뜸(기본 브라우저 선택 가능)
    window.location.href = `intent://${hostPath}#Intent;scheme=https;package=com.android.chrome;end`;
    return;
  }
  if (isIOS) {
    // iOS는 사파리 강제 불가. 크롬 설치 시 크롬 스킴 시도.
    const noProto = absoluteUrl.replace(/^https?:\/\//, "");
    const scheme = absoluteUrl.startsWith("https://") ? "googlechromes://" : "googlechrome://";
    window.location.href = `${scheme}${noProto}`;
    return;
  }
  // 기타 환경
  window.open(absoluteUrl, "_blank", "noopener,noreferrer");
}
