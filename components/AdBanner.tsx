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
        } catch (e) {
          // 재시도는 observers가 계속 트리거해 줌
          // console.warn('adsbygoogle push failed', e)
        }
      }
    }

    // 보이기/사이즈 변화 감지해서 가용 너비가 생기면 push
    const ro = new ResizeObserver(tryPush)
    ro.observe(el)

    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) tryPush()
    })
    io.observe(el)

    // 초기 한 번 시도 (첫 렌더 직후)
    const t = setTimeout(tryPush, 0)

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
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-language={lang}
    />
  )
}
