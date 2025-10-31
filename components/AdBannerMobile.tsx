'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

/**
 * 📱 모바일 전용 가로형(수평 긴) AdSense 광고 컴포넌트
 * 예시 slot: '1234567890'
 */
export default function AdBannerMobile({
  slot,
  className,
  client = 'ca-pub-4564123418761220',
  lang = 'ko',
}: {
  slot: string
  className?: string
  client?: string
  lang?: string
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
          // 옵저버가 다시 호출하므로 무시
        }
      }
    }

    const ro = new ResizeObserver(tryPush)
    ro.observe(el)

    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) tryPush()
    })
    io.observe(el)

    const t = setTimeout(tryPush, 80)

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
      style={{
        display: 'block',
        width: '100%',
        height: '90px', // ✅ 가로형 높이 (필요 시 50~100px 조정)
        textAlign: 'center',
        margin: '8px 0',
      }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="horizontal" // ✅ 가로형
      data-full-width-responsive="true"
      data-language={lang}
    />
  )
}
