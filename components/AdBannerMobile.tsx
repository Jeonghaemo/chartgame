'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window { adsbygoogle: any[] }
}

/**
 * 📢 모바일 수평형(320×100) 고정 광고
 * - 항상 320x100 사이즈로 표시
 * - 반응형(auto) 사용 안 함 → 정사각형/세로형 절대 안 뜸
 */
export default function AdBannerMobile({
  slot = '5937026455', // ← 320×100 광고단위 슬롯 ID
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
      if (el.offsetWidth > 0 && !pushedRef.current) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({})
          pushedRef.current = true
        } catch {
          // 초기 로딩 중엔 무시
        }
      }
    }

    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) tryPush()
    })
    io.observe(el)
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
        display: 'inline-block',
        width: '320px',
        height: '100px',
        margin: '12px auto',
      }}
      data-ad-client={client}
      data-ad-slot={slot}
      // 반응형 속성 제거 → 항상 320×100 고정
    />
  )
}
