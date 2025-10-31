'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window { adsbygoogle: any[] }
}

/**
 * 📢 수평형 전용 “반응형” 구현 (고정 가로형만 선택)
 * - auto 사용 안 함 → 정사각/직사각(300x250 등) 절대 안 뜸
 * - 컨테이너 폭에 맞춰 728x90 / 468x60 / 320x100 / 320x50 중 선택
 * - push 후에는 크기 변경하지 않음(중복/정책 이슈 방지)
 */
export default function AdBannerMobile({
  slot,
  client = 'ca-pub-4564123418761220',
  className,
}: {
  slot: string
  client?: string
  className?: string
}) {
  const insRef = useRef<HTMLModElement | null>(null)
  const pushedRef = useRef(false)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  // 1) 컨테이너 폭을 기반으로 가로형 사이즈 선택
  useEffect(() => {
    const el = insRef.current
    if (!el) return

    const pick = () => {
      const width = Math.floor(el.getBoundingClientRect().width)
      if (width >= 728) return { w: 728, h: 90 }  // Leaderboard
      if (width >= 468) return { w: 468, h: 60 }  // Full banner
      if (width >= 320) return { w: 320, h: 100 } // Large mobile banner
      return { w: 320, h: 50 }                    // Mobile banner
    }

    // push 전에만 사이즈 확정/갱신
    const ensureSize = () => {
      if (pushedRef.current) return
      setSize(pick())
    }

    ensureSize()

    const ro = new ResizeObserver(ensureSize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 2) 화면에 보일 때 한 번만 push
  useEffect(() => {
    if (!insRef.current || pushedRef.current || !size) return

    const el = insRef.current
    const tryPush = () => {
      if (el.offsetWidth > 0 && !pushedRef.current) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({})
          pushedRef.current = true
        } catch {
          // 초기화 실패 시 다음 인터섹션에서 재시도
        }
      }
    }

    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) tryPush()
    })
    io.observe(el)

    const t = setTimeout(tryPush, 80)

    return () => {
      io.disconnect()
      clearTimeout(t)
    }
  }, [size])

  return (
    <ins
      ref={insRef as any}
      className={`adsbygoogle ${className ?? ''}`}
      style={{
        display: 'inline-block',
        width: `${size?.w ?? 320}px`,
        height: `${size?.h ?? 50}px`,
        margin: '12px auto',
      }}
      data-ad-client={client}
      data-ad-slot={slot}
      // ⛔ data-ad-format / data-full-width-responsive 사용 안 함
      //  → 구글이 정사각형을 고르는 걸 원천 차단
    />
  )
}
