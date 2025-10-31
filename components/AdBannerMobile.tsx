'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

/**
 * 📱 공식 AdSense Large Mobile Banner (320×100)
 * 반응형으로 폭에 맞춰 자동 조정되며, 잘림 없이 노출됩니다.
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

    // 크기 변할 때마다 push 재시도
    const ro = new ResizeObserver(tryPush)
    ro.observe(el)

    // 보일 때만 push 실행
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) tryPush()
    })
    io.observe(el)

    // 초기 지연 보정
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
        minHeight: '100px', // ✅ 공식 Large Mobile Banner 기준 높이
        textAlign: 'center',
        margin: '12px 0',
      }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"                // ✅ 반응형 (자동 크기 조정)
      data-full-width-responsive="true"    // ✅ 화면폭 100% 사용
      data-language={lang}
    />
  )
}
