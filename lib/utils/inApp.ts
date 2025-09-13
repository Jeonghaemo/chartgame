// 인앱(WebView) 간단 감지
export function isInAppBrowser(uaRaw?: string) {
  const ua = (uaRaw || (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  if (!ua) return false;
  return (
    ua.includes("kakaotalk") ||
    ua.includes("instagram") || ua.includes("fbav") || ua.includes("fban") ||
    ua.includes("naver(inapp") || ua.includes("naverapp") ||
    ua.includes("line/") ||
    ua.includes("; wv") || ua.includes(" version/") ||
    ua.includes("twitter") || ua.includes("snapchat")
  );
}
