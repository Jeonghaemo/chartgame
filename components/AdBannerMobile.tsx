'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window { adsbygoogle: any[] }
}

export default function AdBannerMobile({
  slot = '5937026455',
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

    // 스크립트 로드 대기
    const loadAd = () => {
      if (typeof window !== 'undefined' && window.adsbygoogle && insRef.current) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({})
          pushedRef.current = true
        } catch (err) {
          console.error('AdSense push error:', err)
        }
      }
    }

    // 약간의 지연 후 광고 로드
    const timer = setTimeout(loadAd, 300)

    return () => clearTimeout(timer)
  }, [])

  return (
    <ins
      ref={insRef as any}
      className={`adsbygoogle ${className ?? ''}`}
      style={{
        display: 'block', // inline-block → block 변경
        width: '320px',
        height: '100px',
      }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="fixed" // 고정 크기 명시
    />
  )
}