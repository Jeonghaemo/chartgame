// app/posts/page.tsx
import Link from "next/link";

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
};

const posts: Post[] = [
  { slug: "avg-price-calculator", title: "평단가 계산기 사용법", excerpt: "여러 차수 매수의 평균단가 계산 흐름과 입력 팁을 정리합니다.", date: "2025-10-03" },
  { slug: "stock-tax-fee", title: "주식 세금/수수료 기초 정리", excerpt: "국내/해외 주식의 세금 구조와 증권사 수수료 개념을 한 번에.", date: "2025-10-03" },
  { slug: "chartgame-guide", title: "차트게임 하는 방법 / 전략", excerpt: "규칙, 턴 운영, 하트, 랭킹 시스템, 실전 팁까지 빠르게 익히기.", date: "2025-10-03" },
  { slug: "stock-faq", title: "주식 초보 FAQ (10문항)", excerpt: "첫 계좌 개설부터 PER·ETF 같은 용어까지 핵심만 문답으로.", date: "2025-10-03" },
  { slug: "domestic-vs-us", title: "국내 vs 미국 주식 차이", excerpt: "세금·환율·거래시간·배당 스케줄 등 실전 차이를 비교합니다.", date: "2025-10-03" },
  { slug: "long-vs-short", title: "장기투자 vs 단타: 장단점", excerpt: "리스크·시간·심리·수수료 측면에서의 트레이드오프 분석.", date: "2025-10-03" },
  { slug: "etf-basics", title: "ETF 기초와 대표 종목", excerpt: "지수추종·섹터·채권형 등 ETF 분류와 예시를 소개합니다.", date: "2025-10-03" },
  { slug: "chart-basics", title: "차트 보는 법 (기본편)", excerpt: "캔들·거래량·추세선 등 핵심 개념을 사례 중심으로 정리.", date: "2025-10-03" },
  { slug: "calculators-overview", title: "투자 계산기 모음 안내", excerpt: "사이트 내 여러 계산기들의 사용 목적과 연결 동선을 안내.", date: "2025-10-03" },
  { slug: "common-mistakes", title: "초보자가 자주 하는 실수 TOP 5", excerpt: "몰빵·무계획 매수·손절없음·레버리지 남용 등 체크리스트.", date: "2025-10-03" },
];

export default function PostsPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-5">주식 정보</h1>
      <ul className="space-y-4">
        {posts.map((p) => (
          <li key={p.slug} className="rounded-lg border border-gray-200 p-4 bg-white">
            <h2 className="text-lg font-semibold">
              <Link href={`/posts/${p.slug}`} className="hover:underline">
                {p.title}
              </Link>
            </h2>
            <p className="text-sm text-gray-600 mt-1">{p.excerpt}</p>
            <div className="text-xs text-gray-400 mt-2">
              작성일: {new Date(p.date).toLocaleDateString("ko-KR")}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
