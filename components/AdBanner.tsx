'use client'

import { useEffect, useRef } from 'react'

declare global { interface Window { adsbygoogle: any[] } }

export default function AdBanner({
  slot,
  className,
  client = 'ca-pub-4564123418761220',
  lang = 'ko',
  responsive = true,      // true면 풀폭 반응형, false면 컨테이너 폭을 넘지 않게 유지
  reserveMinHeight = 0,   // CLS 방지를 위해 픽셀 높이 예약(예: 50)
}: {
  slot: string
  className?: string
  client?: string
  lang?: string
  responsive?: boolean
  reserveMinHeight?: number
}) {
  const insRef = useRef<HTMLModElement | null>(null)
  const pushedRef = useRef(false)

  useEffect(() => {
    if (!insRef.current || pushedRef.current) return
    const el = insRef.current

    const tryPush = () => {
      // 이미 채워진 슬롯이면 초기화(클라 라우팅/재렌더 케이스)
      const status = el.getAttribute("data-adsbygoogle-status")
      if (status === "done") {
        el.innerHTML = ""
        el.removeAttribute("data-adsbygoogle-status")
      }

      const w = el.getBoundingClientRect().width
      if (w > 0 && !pushedRef.current) {
        try {
          ;(window.adsbygoogle = window.adsbygoogle || []).push({})
          pushedRef.current = true
        } catch {
          // 옵저버가 다시 호출해줄 것이므로 여기선 무시
        }
      }
    }

    // 보일 때/크기 변할 때만 push 시도
    const ro = new ResizeObserver(tryPush)
    ro.observe(el)

    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) tryPush()
    })
    io.observe(el)

    // 초기 지연 후 1차 시도 (SSR→CSR 전환 타이밍 커버)
    const t = setTimeout(tryPush, 50)

    return () => {
      clearTimeout(t)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return (
    <ins
      ref={insRef as any}
      className={`adsbygoogle ${className ?? ''}`}
      style={{ display: 'block', width: '100%', minHeight: reserveMinHeight || 0 }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive={responsive ? "true" : "false"}
      data-language={lang}
      // 개발 중 테스트 강제 시:
      // data-adtest="on"
    />
  )
}
