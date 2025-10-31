// app/page.tsx
import { auth } from "@/lib/auth";
import HomeHero from "@/components/HomeHero";
import HomeTopGrid from "@/components/HomeTopGrid";
import AdBanner from "@/components/AdBanner";
import AdBannerMobile from "@/components/AdBannerMobile";

export default async function Home() {
  const session = await auth();

  return (
    <main className="max-w-[1300px] mx-auto px-8 pt-2 pb-8">
      {/* Hero (클라이언트 컴포넌트) */}
      <HomeHero />

        {/* ✅ AdSense 광고 영역 */}
      <div className="my-8">
        <div className="mx-auto w-full px-4">
          {/* PC 전용: 기존 가로 배너 */}
          <div className="hidden md:block">
            <div className="mx-auto w-full max-w-[1000px]">
              <AdBanner slot="2809714485" />
            </div>
          </div>

          {/* 모바일 전용: 새 가로 배너 */}
          <div className="block md:hidden">
            <div className="w-full">
              <AdBannerMobile slot="2809714485" />
            </div>
          </div>
        </div>
      </div>

      {/* 추가 정보 영역 */}
      <section className="mt-4">
        <HomeTopGrid />
      </section>



      {/* 홈 전용 푸터 */}
      <footer className="mt-16 py-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <a href="/terms" className="mx-2 hover:text-gray-700">이용약관</a>
        {" | "}
        <a href="/privacy" className="mx-2 hover:text-gray-700">개인정보처리방침</a>
        {" | "}
        <a href="/contact" className="mx-2 hover:text-gray-700">문의하기</a>
        <p className="mt-3 text-xs text-gray-400">
          © {new Date().getFullYear()} ChartGame. All rights reserved.
        </p>
      </footer>
    </main>
  );
}

