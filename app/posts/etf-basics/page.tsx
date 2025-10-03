// app/posts/etf-basics/page.tsx

export default function EtfBasicsPost() {
  return (
    <main className="max-w-3xl mx-auto p-6 leading-relaxed">
      <h1 className="text-3xl font-bold mb-8">
        ETF 기초와 대표 종목
      </h1>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">1. ETF란 무엇인가?</h2>
        <p>
          ETF(Exchange Traded Fund, 상장지수펀드)는 말 그대로 <strong>거래소에 상장된 펀드</strong>입니다.
          일반 펀드는 하루에 한 번 기준가로 거래되지만, ETF는 개별 주식처럼 시장에서 실시간으로 사고팔 수 있습니다.
          투자자 입장에서는 개별 종목을 직접 고르지 않아도, ETF 한 종목만 매수하면 여러 기업에 동시에 투자하는 효과를 얻을 수 있습니다.
        </p>
        <p>
          예를 들어, KOSPI200 ETF를 매수하면 삼성전자, 현대차, LG화학 등 200개 주요 기업에 동시에 투자하는 셈이 됩니다.
          즉, <strong>분산투자 효과</strong>와 <strong>유동성</strong>을 동시에 갖춘 투자 수단이 바로 ETF입니다.
        </p>

        <h2 className="text-2xl font-semibold">2. ETF의 장점</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>분산투자:</strong> ETF 하나만으로 수십~수백 개 종목에 투자할 수 있어 리스크가 줄어듭니다.</li>
          <li><strong>낮은 비용:</strong> 보통의 펀드보다 운용 보수가 저렴하고, 거래 수수료 외에 추가 비용이 거의 없습니다.</li>
          <li><strong>실시간 거래:</strong> 주식처럼 장중에 원하는 시점에 매수·매도가 가능합니다.</li>
          <li><strong>투명성:</strong> ETF는 편입 종목과 비중이 공개되어 있어, 내가 어떤 자산에 투자하는지 쉽게 알 수 있습니다.</li>
        </ul>
        <p>
          특히 초보 투자자라면 ETF를 활용해 특정 업종이나 지수에 간접 투자하는 것이 개별 종목 리스크를 줄이는 좋은 방법입니다.
        </p>

        <h2 className="text-2xl font-semibold">3. ETF의 단점</h2>
        <p>
          ETF는 장점이 많지만, 단점도 존재합니다. 
          첫째, 개별 종목보다 수익률이 제한적일 수 있습니다. 
          시장 전체에 분산 투자하는 만큼, 특정 종목이 크게 올라도 ETF 전체 수익률은 그만큼 따라가지 못할 수 있습니다.
        </p>
        <p>
          둘째, <strong>추적 오차</strong>라는 문제가 있습니다. ETF는 특정 지수를 추종하지만,
          운용 보수, 배당 재투자 시점, 환율 등으로 인해 실제 수익률이 지수와 약간 차이가 날 수 있습니다.
        </p>
        <p>
          마지막으로, 해외 ETF의 경우 환율 변동 위험이 있습니다. 달러로 거래되는 ETF는 원·달러 환율에 따라 실제 수익률이 달라질 수 있습니다.
        </p>

        <h2 className="text-2xl font-semibold">4. ETF의 종류</h2>
        <p>
          ETF는 투자 대상에 따라 매우 다양한 종류로 나뉩니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>지수 ETF:</strong> KOSPI200, S&P500 등 주요 지수를 그대로 추종합니다.</li>
          <li><strong>섹터 ETF:</strong> 2차전지, 반도체, IT, 헬스케어 등 특정 산업에 집중 투자합니다.</li>
          <li><strong>테마 ETF:</strong> AI, 메타버스, 친환경 에너지 등 트렌드 기반 ETF.</li>
          <li><strong>채권/원자재 ETF:</strong> 국채, 금, 원유 등 주식 외 자산에 투자할 수 있는 ETF.</li>
          <li><strong>레버리지/인버스 ETF:</strong> 지수의 2배 수익, 반대로 움직이는 상품 등 고위험 ETF.</li>
        </ul>
        <p>
          투자자는 자신의 목적(안정적 장기 투자, 단기 수익 추구, 특정 산업 노출 등)에 따라 적합한 ETF를 선택해야 합니다.
        </p>

        <h2 className="text-2xl font-semibold">5. 국내 대표 ETF</h2>
        <p>
          한국 투자자들이 많이 찾는 국내 ETF는 다음과 같습니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>KODEX 200:</strong> KOSPI200 지수를 추종하는 대표 ETF.</li>
          <li><strong>KODEX 코스닥150:</strong> 코스닥 주요 150개 기업에 분산 투자.</li>
          <li><strong>TIGER 2차전지테마:</strong> 전기차 배터리 관련 기업 집중 투자.</li>
          <li><strong>KODEX 배당성장:</strong> 배당 성향이 높은 우량 기업 위주 투자.</li>
        </ul>
        <p>
          이들 ETF는 거래량이 많아 유동성이 풍부하고, 초보자가 접근하기 좋습니다.
        </p>

        <h2 className="text-2xl font-semibold">6. 미국 대표 ETF</h2>
        <p>
          미국 시장은 ETF 천국이라 불릴 만큼 다양한 상품이 존재합니다. 그중에서도 가장 대표적인 것은 다음과 같습니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>SPY:</strong> S&P500 지수를 추종하는 세계 최대 규모 ETF.</li>
          <li><strong>QQQ:</strong> 나스닥100 지수를 추종, 애플·마이크로소프트·구글 등 빅테크 기업 포함.</li>
          <li><strong>VTI:</strong> 미국 전체 주식시장에 투자하는 종합 ETF.</li>
          <li><strong>ARKK:</strong> 혁신 성장주 위주, 고위험·고수익 성향 ETF.</li>
        </ul>
        <p>
          미국 ETF는 선택지가 워낙 다양하기 때문에 본인의 투자 목적과 리스크 성향에 맞춰 신중히 선택하는 것이 중요합니다.
        </p>

        <h2 className="text-2xl font-semibold">7. ETF 투자 전략</h2>
        <p>
          ETF를 효과적으로 활용하려면 단순히 매수하는 것보다 <strong>투자 전략</strong>을 세우는 것이 중요합니다.
        </p>
        <ol className="list-decimal ml-6 space-y-3">
          <li><strong>장기 분할 매수:</strong> S&P500 같은 지수 ETF는 꾸준히 분할 매수하면 장기적으로 안정적인 수익률을 기대할 수 있습니다.</li>
          <li><strong>섹터 로테이션:</strong> 경기 상황에 따라 유리한 섹터 ETF를 교체하며 투자하는 전략.</li>
          <li><strong>위험 관리:</strong> 레버리지·인버스 ETF는 전체 자산의 일부만 활용, 손실 한도를 반드시 설정.</li>
          <li><strong>배당 재투자:</strong> 배당형 ETF는 수익금을 재투자해 복리 효과를 극대화.</li>
        </ol>

        <h2 className="text-2xl font-semibold">8. 마무리</h2>
        <p>
          ETF는 초보자부터 전문가까지 모두 활용할 수 있는 강력한 투자 도구입니다. 
          개별 종목 리스크를 줄이고, 다양한 산업과 국가에 쉽게 분산 투자할 수 있으며, 
          거래도 간편합니다. 다만 종류가 많고 위험 성향이 다른 상품이 많으므로, 
          본인 투자 성향에 맞는 ETF를 선택하는 것이 무엇보다 중요합니다.
        </p>
        <p>
          👉 다음 글에서는{" "}
          <a href="/posts/compound-interest" className="text-blue-600 underline">
            복리의 힘과 장기 투자 효과
          </a>{" "}
          를 다뤄보며 ETF 장기투자와 연결되는 원리를 설명하겠습니다.
        </p>
      </section>
    </main>
  );
}
