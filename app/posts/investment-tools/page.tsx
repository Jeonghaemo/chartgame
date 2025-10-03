// app/posts/investment-tools/page.tsx

export default function InvestmentToolsPost() {
  return (
    <main className="max-w-3xl mx-auto p-6 leading-relaxed">
      <h1 className="text-3xl font-bold mb-8">
        투자 계산기와 도구 활용법
      </h1>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">1. 왜 계산기와 도구가 필요한가?</h2>
        <p>
          주식 투자는 단순히 감에 의존해서는 성공하기 어렵습니다. 
          매수 단가, 평단가, 수익률, 세금, 환율 같은 수치는 생각보다 복잡하게 얽혀 있습니다. 
          예를 들어 “주가가 5% 올랐으니 50만 원 벌었다”라고 단순 계산하면 실제 수익과 다를 수 있습니다. 
          수수료와 세금을 반영하지 않으면 체감 수익률은 훨씬 낮아집니다.
        </p>
        <p>
          이런 문제를 해결하기 위해 <strong>투자 계산기</strong>와 다양한 <strong>투자 도구</strong>를 활용하면 
          훨씬 정확한 의사결정을 내릴 수 있습니다. 
          이는 단순 편의가 아니라 장기적으로 계좌를 지키고 수익률을 개선하는 핵심 습관이 됩니다.
        </p>

        <h2 className="text-2xl font-semibold">2. 평단가 계산기</h2>
        <p>
          가장 기본적인 도구는 <strong>평단가 계산기</strong>입니다. 
          여러 차례 매수한 종목의 평균 단가를 자동으로 계산해 주므로, 
          본전 가격과 목표가를 쉽게 확인할 수 있습니다. 
        </p>
        <p>
          수수료와 환율까지 반영하면 실제 체감 평단가와 가까운 결과를 얻을 수 있고, 
          추가 매수 시 평단가가 어떻게 변하는지도 즉시 확인할 수 있습니다.
        </p>
        <p>
          👉 바로가기:{" "}
          <a href="/calculators/avg" className="text-blue-600 underline">
            평단가 계산기
          </a>
        </p>

        <h2 className="text-2xl font-semibold">3. 수익률 계산기</h2>
        <p>
          단순히 “얼마 벌었나”가 아니라, 투자금 대비 <strong>수익률</strong>을 계산하는 것이 중요합니다. 
          수익률 계산기는 매수·매도가, 수수료, 세금 등을 반영해 실제 수익률을 알려줍니다. 
          특히 해외 주식은 환율 변동까지 고려해야 하므로, 수익률 계산기의 역할이 더욱 큽니다.
        </p>
        <p>
          👉 바로가기:{" "}
          <a href="/calculators/yield" className="text-blue-600 underline">
            수익률 계산기
          </a>
        </p>

        <h2 className="text-2xl font-semibold">4. 목표 수익/손절가 계산기</h2>
        <p>
          투자에서 가장 중요한 것은 계획입니다. 
          매수하기 전에 목표 수익률과 손절 기준을 정해두면 감정적인 매매를 줄일 수 있습니다. 
          목표 수익/손절가 계산기는 평단가에 ±%를 적용해, 어느 가격에서 매도해야 할지를 알려줍니다.
        </p>
        <p>
          예를 들어 평단가가 5,000원이고 목표 수익률이 10%라면 목표가는 5,500원, 
          손절 기준이 -5%라면 손절가는 4,750원이 됩니다. 
          이렇게 미리 숫자로 기준을 정해두면 실제 매매에서 흔들리지 않습니다.
        </p>

        <h2 className="text-2xl font-semibold">5. 복리 계산기</h2>
        <p>
          장기 투자에서 중요한 것은 <strong>복리 효과</strong>입니다. 
          복리 계산기를 통해 원금, 기간, 예상 수익률을 입력하면 
          미래의 예상 자산 규모를 시뮬레이션할 수 있습니다. 
          예를 들어 연 7% 수익률로 20년 동안 투자한다면 원금은 약 3.87배로 불어납니다. 
          이런 계산은 장기 투자 동기를 부여하고, 무리한 단타 욕심을 줄이는 데 도움이 됩니다.
        </p>
        <p>
          👉 관련 글:{" "}
          <a href="/posts/compound-interest" className="text-blue-600 underline">
            복리의 힘과 장기 투자 효과
          </a>
        </p>

        <h2 className="text-2xl font-semibold">6. 환율 계산기</h2>
        <p>
          해외 주식을 거래한다면 반드시 환율을 고려해야 합니다. 
          환율 계산기를 사용하면 달러 환율 변화가 원화 기준 수익에 어떤 영향을 주는지 즉시 확인할 수 있습니다. 
          주가가 그대로여도 환율에 따라 수익이 달라지기 때문에, 환율 계산기는 필수 도구입니다.
        </p>

        <h2 className="text-2xl font-semibold">7. 리스크 관리 도구</h2>
        <p>
          단순 계산기뿐 아니라, 포트폴리오 비중을 관리할 수 있는 도구도 중요합니다. 
          예를 들어 전체 자산 중 특정 종목이 30% 이상을 차지하면 위험 신호가 됩니다. 
          이를 시각적으로 보여주는 <strong>비중 분석 도구</strong>나 
          손절 기준을 설정할 수 있는 <strong>리스크 관리 툴</strong>을 활용하면 
          감정적인 실수를 줄일 수 있습니다.
        </p>

        <h2 className="text-2xl font-semibold">8. 활용 팁</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>계산 결과를 기록해 두고, 실제 투자 결과와 비교하면서 학습하기</li>
          <li>장기 목표와 단기 매매를 분리해 각각 다른 계산기로 관리하기</li>
          <li>계산기를 단순 참고용이 아닌, <strong>투자 원칙</strong>의 일부로 포함시키기</li>
        </ul>

        <h2 className="text-2xl font-semibold">9. 마무리</h2>
        <p>
          투자 계산기와 도구들은 단순히 편리함을 제공하는 수준을 넘어, 
          투자자의 행동을 체계화하고 감정을 제어하는 역할을 합니다. 
          평단가, 수익률, 복리, 환율, 리스크 관리 등 다양한 계산기를 활용하면 
          “막연한 추측” 대신 <strong>숫자에 근거한 매매</strong>가 가능해집니다.
        </p>
        <p>
          👉 지금 바로{" "}
          <a href="/calculators" className="text-blue-600 underline">
            투자 계산기 모음
          </a>{" "}
          페이지에서 다양한 계산기를 활용해 보세요. 
          작은 습관의 차이가 장기적으로 큰 성과를 만듭니다.
        </p>
      </section>
    </main>
  );
}
