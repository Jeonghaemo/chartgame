// components/AdBanner.tsx
'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window { adsbygoogle: any[] }
}

export default function AdBanner({
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
      // ✅ 폭 0 문제 방지: display:block + width:100%
      style={{ display: 'block', width: '100%' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-language={lang}
    />
  )
}
