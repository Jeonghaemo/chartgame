// app/posts/market-cycles/page.tsx

export default function MarketCyclesPost() {
  return (
    <main className="max-w-3xl mx-auto p-6 leading-relaxed">
      <h1 className="text-3xl font-bold mb-8">
        주식 시장 사이클 완전 정리 (상승·하락·횡보 이해하기)
      </h1>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">1) 왜 ‘사이클’부터 이해해야 하는가</h2>
        <p>
          같은 차트라도 <strong>시장 사이클</strong>에 따라 의미가 달라집니다. 
          상승장에서의 눌림은 매수 기회가 되지만, 하락장에서는 같은 눌림이
          <strong>추세 지속</strong>의 중간 파동일 수 있습니다. 
          즉, 개별 종목보다 먼저 <strong>시장의 상태(레짐)</strong>를 규정해야 
          트레이드 논리와 리스크 한계를 정확히 정할 수 있습니다. 
          이 글은 상승(Uptrend)·하락(Downtrend)·횡보(Sideways) 3단계를 중심으로 
          거시 변수와 기술적 신호를 통합해 <strong>사이클별 전략</strong>을 제시합니다.
        </p>

        <h2 className="text-2xl font-semibold">2) 사이클 3단계: 상승·하락·횡보의 정의</h2>
        <p>
          <strong>상승장</strong>은 고점과 저점이 모두 높아지는 구간으로, 
          <strong>가격 경사</strong>(기울기)와 <strong>거래량 동반</strong>이 포인트입니다. 
          <strong>하락장</strong>은 고점·저점이 모두 낮아지며, 반등이 나와도 
          이전 고점을 회복하지 못하는 특징이 있습니다. 
          <strong>횡보장</strong>은 박스권 내에서 수렴·확장이 반복되며, 
          방향성이 약한 대신 <strong>스윙 구간</strong>이 자주 발생합니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li>상승장: 고점·저점 상승 + 이동평균 <strong>상방 정렬</strong>(단기 &gt; 중기 &gt; 장기)</li>
          <li>하락장: 고점·저점 하락 + 이동평균 <strong>하방 정렬</strong>(단기 &lt; 중기 &lt; 장기)</li>
          <li>횡보장: 고점·저점이 수평 박스 내 진동 + 이평선 <strong>뒤엉킴</strong> 및 변동성 축소</li>
        </ul>

        <h2 className="text-2xl font-semibold">3) 거시 변수와 사이클의 상호작용</h2>
        <p>
          사이클은 단순 차트 패턴의 합이 아니라, <strong>자금의 흐름</strong>이 만든 결과입니다. 
          금리·환율·유동성(유동성 공급·흡수)·신용 스프레드 같은 변수는 
          시장의 체온계를 이룹니다. 예를 들어 긴축 국면에서는 성장주의 멀티플이 압축되며, 
          달러 강세는 신흥국·수출주에 압박을 가합니다. 
          이때 개별 종목만 보면 “이상한 노이즈”처럼 보이던 흐름이, 
          <strong>사이클 관점</strong>에서는 필연이 됩니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>금리 ↑</strong>: 할인율 상승 → 멀티플 압축(특히 성장주), 경기 민감주 선택적 강세</li>
          <li><strong>달러 강세</strong>: 원자재·신흥국 약세, 수입물가 부담</li>
          <li><strong>유동성 축소</strong>: 위험자산 전반 밸류에이션 하락 압력</li>
          <li><strong>신용스프레드 확대</strong>: 위험 회피 심리 증가 → 방어주·현금 비중↑</li>
        </ul>

        <h2 className="text-2xl font-semibold">4) 레짐(시장 상태) 판별: 실전 체크리스트</h2>
        <p>
          아래 6가지 항목으로 현재 레짐을 빠르게 진단할 수 있습니다. 
          모두가 필요한 것은 아니며, <strong>3개 이상 일치</strong>하면 해당 레짐 가중치를 높여도 좋습니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>가격 구조</strong>: 고저점 패턴이 상향/하향/수평인가?</li>
          <li><strong>이동평균 정렬</strong>: 단·중·장기 이평선의 위치 관계</li>
          <li><strong>변동성</strong>: ATR, 볼린저밴드 폭 — 수렴/발산 여부</li>
          <li><strong>거래량</strong>: 상승(또는 하락) 동반 거래량 증가 유무</li>
          <li><strong>섹터 로테이션</strong>: 성장 → 가치/경기민감 → 방어주 순환 흐름</li>
          <li><strong>거시</strong>: 금리·환율·유동성과 시장의 동행/역행</li>
        </ul>

        <h2 className="text-2xl font-semibold">5) 상승장 전략: 눌림·리테스트 중심</h2>
        <p>
          상승장의 핵심은 <strong>추세 순응</strong>입니다. 
          추세선을 기준으로 하는 <strong>저점 높임</strong> 구간, 
          전고점 <strong>돌파 후 리테스트</strong> 구간이 고효율 포인트입니다. 
          단기 이평(10·20)이 중기 이평(60) 위에 있고, <strong>거래량 동반</strong> 시 신뢰도가 커집니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>진입</strong>: 20일선 부근 눌림 + 캔들 전환(상승 전환 신호)</li>
          <li><strong>손절</strong>: 최근 스윙로우 하향 이탈(종가 기준), 혹은 20일선 확정 이탈</li>
          <li><strong>청산</strong>: 전고점 근처 분할, 과열 신호(RSI 과매수·장대양봉) 일부 청산</li>
          <li><strong>추가</strong>: 돌파-리테스트 성공 시 소량 추가 진입</li>
        </ul>
        <p>
          <em>심리 팁:</em> 상승장에서는 “놓친 것”에 집착하지 말고, 
          <strong>다음 리테스트</strong>를 기다리는 <strong>재현 가능한 습관</strong>이 더 큰 성과를 만듭니다.
        </p>

        <h2 className="text-2xl font-semibold">6) 하락장 전략: 반등은 매도 기회</h2>
        <p>
          하락장은 반등을 주더라도 <strong>이전 고점을 회복하지 못하는</strong> 경우가 많습니다. 
          <strong>저점 낮춤</strong> 패턴이 유효한 동안은 역추세 매수보다 
          <strong>현금 비중 확대</strong> 또는 <strong>단기 숏/인버스</strong> 전략이 합리적입니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>진입</strong>: 반등이 20·60일선에 막히며 음봉 전환되는 자리의 숏</li>
          <li><strong>손절</strong>: 직전 스윙하이 상향 돌파(종가 확정) 시</li>
          <li><strong>청산</strong>: 전저점 부근 또는 과매도 반등 시 분할</li>
          <li><strong>회피</strong>: 금리·달러 강세 지속 구간에서 성장주 추격 매수 금지</li>
        </ul>
        <p>
          <em>심리 팁:</em> 하락장에서의 가장 큰 실수는 <strong>평균단가 낮추기</strong>입니다. 
          손절 기준이 무너지면 계좌가 보호되지 않습니다. 
          손절은 비용이 아니라 <strong>보험료</strong>입니다.
        </p>

        <h2 className="text-2xl font-semibold">7) 횡보장 전략: 박스 트레이딩과 변동성 수렴</h2>
        <p>
          횡보장은 방향성 보다는 <strong>범위 거래</strong>가 유리합니다. 
          상단 저항·하단 지지에서 분할 접근하며, 거짓 돌파(페이크아웃)를 경계합니다. 
          변동성 수렴 후 <strong>방향성 이탈</strong>이 나오면 추세 전환의 시작이 될 수 있습니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>진입</strong>: 박스 하단(지지) 근처의 반등 전환 캔들</li>
          <li><strong>손절</strong>: 박스 하단 종가 이탈 확정</li>
          <li><strong>청산</strong>: 박스 상단 근처 분할, 과열 신호 발생 시 일부 정리</li>
          <li><strong>브레이크아웃</strong>: 거래량 동반 상단 돌파 시 추세 전환 시나리오로 전환</li>
        </ul>

        <h2 className="text-2xl font-semibold">8) 사이클 전환의 신호: 어디서 바뀌는가</h2>
        <p>
          전환은 대개 <strong>가격 구조의 변화</strong>와 <strong>거래량</strong>이 동반됩니다. 
          상승→하락 전환에서는 <strong>고점 갱신 실패</strong> 후 하락 파동이 전고 아래에서 멈추지 못하고 
          <strong>저점 갱신</strong>을 만들며, 이평 정렬이 무너집니다. 
          하락→상승 전환에서는 <strong>저점 갱신 실패</strong>와 <strong>고점 갱신</strong>이 연속해 발생하며 
          거래량이 추세 반대로 붙기 시작합니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li>상승→하락: 전고 미갱신 + 스윙로우 붕괴 + 단기 이평이 장기 이평 하회</li>
          <li>하락→상승: 전저 미갱신 + 스윙하이 돌파 + 단기 이평이 장기 이평 상회</li>
          <li>횡보→추세: 수렴 종료(밴드 압축) + 방향 이탈 시 거래량 급증</li>
        </ul>

        <h2 className="text-2xl font-semibold">9) 멀티 타임프레임: 상위 주기가 법이다</h2>
        <p>
          레짐 판단은 <strong>상위 주기</strong>에서 시작해야 합니다. 
          주봉/일봉으로 큰 추세를 확정하고, 4시간/30분봉으로 타이밍을 잡습니다. 
          상위 상승·하위 하락은 <strong>눌림 조정</strong>일 수 있고, 
          상위 하락·하위 상승은 <strong>반등</strong>일 수 있습니다. 
          상위와 하위의 <strong>방향 합치</strong>가 날 때만 베팅 강도를 높이는 게 
          장기 승률을 좌우합니다.
        </p>

        <h2 className="text-2xl font-semibold">10) 실전 예시: 동일 패턴, 다른 해석</h2>
        <p>
          동일한 “돌파”라도 레짐에 따라 성공률이 달라집니다. 
          상승장에서는 전고 돌파가 <strong>추세 가속</strong>으로 이어질 가능성이 높고, 
          하락장에서는 <strong>숏 커버링</strong>에 불과해 금방 꺾일 수 있습니다. 
          횡보장에서는 돌파 후 <strong>리테스트 실패</strong>가 잦으니 
          재진입 계획을 포함한 <strong>조건부 시나리오</strong>가 필수입니다.
        </p>

        <h2 className="text-2xl font-semibold">11) 레짐별 포지션 관리 규칙</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>상승장</strong>: 이익 실현은 분할, 추세선 이탈 전까지 <strong>탑다운 홀딩</strong></li>
          <li><strong>하락장</strong>: 현금·방어주·헤지 비중 상향, 역추세 매수는 소액·짧은 손절</li>
          <li><strong>횡보장</strong>: 사이즈 축소, 박스 상·하단만 선택적으로 공략</li>
        </ul>
        <p>
          언제나 <strong>리스크 한도(1~2%)</strong>를 먼저 정하고, 
          “손절가 도달 시 자동 청산”을 실행 가능한 크기로 진입하세요.
        </p>

        <h2 className="text-2xl font-semibold">12) 체크리스트 (바로 적용)</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>지금 시장의 고·저점 패턴은? (상향/하향/수평)</li>
          <li>이평 정렬은 순서가 정돈되어 있는가?</li>
          <li>변동성(밴드/ATR)은 수렴 중인가, 발산 중인가?</li>
          <li>돌파/이탈에 거래량이 붙는가?</li>
          <li>거시 변수는 어떤 방향과 속도로 변화 중인가?</li>
          <li>상위 주기와 하위 주기의 방향이 합치되는가?</li>
        </ul>

        <h2 className="text-2xl font-semibold">13) 차트게임으로 사이클 감각 익히기</h2>
        <p>
          사이클 이해는 반복 노출이 핵심입니다. 
          👉 <a href="/game" className="text-blue-600 underline">차트게임</a>에서 
          <strong>상승·하락·횡보</strong>의 패턴을 의도적으로 골라 복습해보세요. 
          50턴 제한은 <strong>선택적 매매</strong> 습관을 길러줍니다. 
          시뮬레이션 결과는 매매 일지와 함께 기록하면 학습 효율이 크게 상승합니다.
        </p>

        <h2 className="text-2xl font-semibold">14) 마무리</h2>
        <p>
          시장은 항상 변하지만, <strong>사이클의 문법</strong>은 반복됩니다. 
          레짐 판별 → 전략 선택 → 리스크 관리라는 틀을 유지하면 
          예측보다 <strong>대응</strong>이 쉬워집니다. 
          다음 단계로는 아래 글들을 함께 읽어, 사이클 해석을 
          실제 매매 기준으로 구체화해 보세요.
        </p>

        <p className="text-sm text-gray-600 mt-6">
          관련글 보기:{" "}
          <a href="/posts/chart-basics" className="text-blue-600 underline">차트 보는 법 (기본편)</a>
          {" , "}
          <a href="/posts/long-vs-short" className="text-blue-600 underline">롱 vs 숏: 언제 어떤 포지션?</a>
          {" , "}
          <a href="/posts/domestic-vs-us" className="text-blue-600 underline">국내 vs 미국 주식의 차이</a>
        </p>
      </section>
    </main>
  );
}
