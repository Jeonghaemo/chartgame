'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

/**
 * 📢 수평형 반응형(Responsive Leaderboard) 광고
 *  - Google 공식 권장 설정 (data-ad-format="auto" + full-width-responsive)
 *  - 폭에 따라 728x90 / 468x60 / 320x100 등 자동 조정
 */
export default function AdBannerMobile({
  slot = '5937026455', // ✅ 차트게임 수평형 광고 슬롯 ID
  client = 'ca-pub-4564123418761220',
  className,
}: {
  slot?: string
  client?: string
  className?: string
}) {
  const insRef = useRef<HTMLModElement | null>(null)
  const pushedRef = useRef(false)

  useEffect(() => {
    if (!insRef.current || pushedRef.current) return
    const el = insRef.current

    const tryPush = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0 && !pushedRef.current) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({})
          pushedRef.current = true
        } catch {
          // 초기 로딩 중엔 무시 — IntersectionObserver가 다시 호출
        }
      }
    }

    // 화면에 등장하면 push 실행
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) tryPush()
    })
    io.observe(el)

    // 초기 지연 후 1차 시도
    const t = setTimeout(tryPush, 100)

    return () => {
      io.disconnect()
      clearTimeout(t)
    }
  }, [])

  return (
    <ins
      ref={insRef as any}
      className={`adsbygoogle ${className ?? ''}`}
      style={{
        display: 'block',
        width: '100%',
        minHeight: '90px', // 기본 예약 높이 (728x90 기준)
        textAlign: 'center',
        margin: '12px 0',
      }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"                // ✅ 반응형 (자동 크기)
      data-full-width-responsive="true"    // ✅ 폭 100% 사용
    />
  )
}
