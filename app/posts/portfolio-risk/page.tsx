// app/posts/portfolio-risk/page.tsx

export default function PortfolioRiskPost() {
  return (
    <main className="max-w-3xl mx-auto p-6 leading-relaxed">
      <h1 className="text-3xl font-bold mb-8">
        주식 포트폴리오 분산과 리스크 관리 심화편
      </h1>

      <section className="space-y-8">
        <p>
          대부분의 투자자는 “좋은 종목을 고르면 된다”고 생각하지만, 장기적으로 생존을 결정하는 건{" "}
          <strong>포트폴리오 구성과 리스크 관리</strong>입니다. 같은 수익률을 내더라도
          변동성이 절반이라면 그것이 훨씬 “좋은 투자”입니다.
          이 글은 기본적인 분산 투자 개념을 넘어,
          실제 투자에서 적용 가능한 <strong>리스크 관리의 구조</strong>를 설명합니다.
        </p>

        <h2 className="text-2xl font-semibold">1) 분산투자의 본질: 불확실성에 대한 방어</h2>
        <p>
          분산투자의 목적은 단순히 “많이 나누는 것”이 아닙니다.
          <strong>서로 다른 리스크 요인</strong>에 노출된 자산을 섞어 전체 변동성을 낮추는 것입니다.
          같은 산업군 종목을 여러 개 담는 것은 진정한 분산이 아닙니다.
          기술주만 10개를 담았다면, 결국 한 산업의 경기 사이클에 종속됩니다.
        </p>
        <p>
          진정한 분산은 <strong>상관관계(Correlation)</strong>가 낮은 자산을 결합하는 것입니다.
          예를 들어 미국 성장주와 한국 수출주, 금 ETF, 단기채 ETF를 섞으면,
          경제 변수에 대한 반응이 다르기 때문에 충격 완화 효과가 커집니다.
        </p>

        <h2 className="text-2xl font-semibold">2) 리스크는 ‘변동성’이 아니라 ‘불확실성’</h2>
        <p>
          일반적으로 리스크 = 변동성으로 정의하지만, 실전에서는{" "}
          <strong>예상치 못한 결과의 폭</strong>을 의미합니다.
          예를 들어, 변동성은 높지만 논리적으로 설명 가능한 자산(성장주)은 감당 가능하지만,
          갑작스러운 제도 리스크(규제, 세금 등)는 통제 불가능한 리스크입니다.
        </p>
        <p>
          따라서 리스크 관리는 ‘가격 흔들림을 참는 것’이 아니라,
          <strong>예측 불가능한 상황에 대비하는 구조</strong>를 만드는 것입니다.
          핵심은 다음 세 가지입니다:
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>1. 손절 라인</strong> — 손실 한도를 명확히 정의</li>
          <li><strong>2. 포지션 사이즈</strong> — 계좌 리스크 1~2% 원칙 유지</li>
          <li><strong>3. 상관관계 관리</strong> — 동일 리스크 요인 자산의 중복 회피</li>
        </ul>

        <h2 className="text-2xl font-semibold">3) 상관관계와 섹터 밸런싱</h2>
        <p>
          예를 들어 반도체, 2차전지, IT서비스는 모두 기술 섹터 내에 묶입니다.
          이 셋을 3:3:3으로 구성하더라도, 사실상 <strong>하나의 방향 리스크</strong>를 가진 포트폴리오입니다.
          반면 기술주 + 헬스케어 + 금융 + 원자재 + 채권 ETF로 구성하면
          경기 민감도, 금리 민감도, 환율 노출이 달라져 충격 흡수력이 커집니다.
        </p>
        <p>
          실전에서는 4~6종목(또는 ETF)으로도 충분히 분산 효과를 얻을 수 있습니다.
          중요한 건 “무엇을 더 담느냐”가 아니라 “<strong>무엇에 이미 노출돼 있는가</strong>”를 파악하는 것입니다.
        </p>

        <h2 className="text-2xl font-semibold">4) 섹터별 리스크 예시</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>기술주</strong>: 금리·환율 민감, 성장률 하락에 취약</li>
          <li><strong>소비재</strong>: 경기 사이클 따라 움직이며 방어력 중간</li>
          <li><strong>에너지/원자재</strong>: 인플레이션·지정학적 리스크</li>
          <li><strong>헬스케어</strong>: 방어주 성격, 규제 리스크 존재</li>
          <li><strong>채권/현금성</strong>: 수익 낮지만, 하락장 완충 효과</li>
        </ul>
        <p>
          섹터별 성격을 이해하고 균형을 맞추면 시장 충격에 대한 내성이 생깁니다.
        </p>

        <h2 className="text-2xl font-semibold">5) 포트폴리오 구성의 기본 원칙</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>핵심(Core)</strong>: 장기 성장 기대자산 (예: S&P500 ETF, 코스피200)</li>
          <li><strong>위성(Satellite)</strong>: 단기 모멘텀 또는 이벤트 트레이드 종목</li>
          <li><strong>안정 자산</strong>: 채권, 달러, 금 ETF 등</li>
        </ul>
        <p>
          비율은 보통 <strong>핵심 60~70%</strong>, <strong>위성 20~30%</strong>, <strong>안정 10%</strong> 정도로 시작합니다.
          포트폴리오가 한쪽으로 쏠리면, 전체 변동성이 커지고 손실 회복 속도가 느려집니다.
        </p>

        <h2 className="text-2xl font-semibold">6) 리밸런싱: 분산의 완성</h2>
        <p>
          분산은 한 번으로 끝나는 게 아니라 <strong>유지</strong>가 핵심입니다.
          수익률이 높은 자산은 비중이 자동으로 커지기 때문에,
          일정 주기(3개월~6개월)마다 리밸런싱을 통해 비중을 원래 비율로 되돌립니다.
          이 과정은 “싸게 사고 비싸게 판다”의 자동화된 형태입니다.
        </p>
        <p>
          장기 수익의 대부분은 리밸런싱에서 옵니다.
          리스크는 변동성의 함수가 아니라, <strong>비중 왜곡의 함수</strong>입니다.
        </p>

        <h2 className="text-2xl font-semibold">7) 실전 예시 (ETF 중심)</h2>
        <pre className="bg-gray-100 rounded-lg p-4 text-sm whitespace-pre-wrap">{`[균형형 예시]
- S&P500 (미국 주식) 40%
- KOSPI200 ETF (국내 주식) 20%
- 미국 중기채 (IEF 등) 20%
- 금 ETF 10%
- 달러 ETF 10%

[공격형 예시]
- 나스닥100 50%
- 반도체/IT 섹터 ETF 20%
- 헬스케어 ETF 10%
- 금/현금 20%`}</pre>

        <h2 className="text-2xl font-semibold">8) 리스크 관리의 3단계 점검</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>① <strong>한 종목 비중</strong>이 25% 이상인가? → 과집중 위험</li>
          <li>② <strong>섹터 중복</strong>이 2개 이상인가? → 경기 리스크 확대</li>
          <li>③ <strong>손절 기준</strong>이 자산별로 명시되어 있는가?</li>
          <li>④ <strong>현금 비중</strong> 10% 이상 확보 중인가?</li>
          <li>⑤ <strong>리밸런싱 주기</strong>가 정해져 있는가?</li>
        </ul>

        <h2 className="text-2xl font-semibold">9) 차트게임으로 리스크 감각 익히기</h2>
        <p>
          👉 <a href="/game" className="text-blue-600 underline">차트게임</a>에서
          종목별 변동성을 체험해 보세요. 동일 자본으로도 종목마다 손익 폭이 다르게 느껴집니다.
          이 경험이 바로 “리스크 감각”을 만드는 첫걸음입니다.
          <a href="/posts/trading-journal" className="text-blue-600 underline">매매 일지</a>에 
          종목별 손익폭·감정 기록을 남기면, 과집중 포지션의 위험을 수치로 확인할 수 있습니다.
        </p>

        <h2 className="text-2xl font-semibold">10) 마무리</h2>
        <p>
          리스크 관리는 수익을 제한하는 게 아니라, <strong>생존 확률을 높이는 과정</strong>입니다.
          분산·손절·리밸런싱의 세 가지 기둥만 지켜도,
          단기 변동에 흔들리지 않는 안정적인 복리 곡선을 만들 수 있습니다.
          승리는 ‘큰 수익’보다 <strong>큰 손실을 피하는 힘</strong>에서 시작됩니다.
        </p>

        <p className="text-sm text-gray-600 mt-6">
          관련글 보기:{" "}
          <a href="/posts/risk-management" className="text-blue-600 underline">리스크 관리의 기본</a>
          {" , "}
          <a href="/posts/market-cycles" className="text-blue-600 underline">시장 사이클 완전 정리</a>
          {" , "}
          <a href="/posts/etf-basics" className="text-blue-600 underline">ETF 기초 가이드</a>
        </p>
      </section>
    </main>
  );
}
