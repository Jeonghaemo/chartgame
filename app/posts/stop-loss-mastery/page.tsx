// app/posts/stop-loss-mastery/page.tsx

export default function StopLossMasteryPost() {
  return (
    <main className="max-w-3xl mx-auto p-6 leading-relaxed">
      <h1 className="text-3xl font-bold mb-8">
        손절 라인 설정의 모든 것 (기준·심리·실수)
      </h1>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">1) 왜 손절 라인이 투자 실력의 핵심인가</h2>
        <p>
          수익은 <strong>시장</strong>이 주지만, 손실은 <strong>내가 통제</strong>해야 합니다. 
          손절(Line)은 단순히 “더 떨어지면 파는 곳”이 아니라, 
          내 전략의 가정이 <strong>무효화</strong>되는 지점입니다. 
          따라서 손절 기준은 <em>가격 변동</em>이 아니라 <em>논리의 무효화</em>를 기준으로 잡아야 합니다. 
          손절 라인이 선명할수록 진입은 과감해지고, 보유는 담대해집니다.
        </p>

        <h2 className="text-2xl font-semibold">2) 손절 라인의 4가지 유형</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>
            <strong>구조(Structure) 기반</strong> — 최근 <em>스윙로우/스윙하이</em>, 
            전저/전고, 추세선 이탈 시 손절. 
            “<strong>내가 본 구조가 깨지면 끝</strong>”이라는 가장 직관적 기준.
          </li>
          <li>
            <strong>변동성(ATR) 기반</strong> — 평균진폭(예: 14일 ATR)의 1.0~1.5배 바깥에 손절. 
            노이즈가 아닌 <em>실제 추세 붕괴</em>만 포착하려는 접근.
          </li>
          <li>
            <strong>시간(Time) 기반</strong> — 특정 조건(돌파/리테스트 등)이 
            <em>정해진 기간</em> 내 발생하지 않으면 정리. 
            방향은 맞지만 타이밍이 어긋난 트레이드를 걸러줌.
          </li>
          <li>
            <strong>가격·비율 기반</strong> — 계좌 리스크 한도(예: 1~2%)로 역산한 고정 폭 손절. 
            포지션 사이징과 함께 써야 효과적.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold">3) 어디에 놓을 것인가: “무효화”의 좌표</h2>
        <p>
          손절은 “더 떨어지면 무섭다”가 아니라, 
          <strong>내 시나리오가 틀렸음을 확인</strong>하는 자리여야 합니다. 
          예를 들어 상승 추세 눌림 진입이라면 손절은 보통 <em>최근 스윙로우 하회</em>나 
          <em>20일선 종가 이탈 확정</em> 등으로 둡니다. 
          돌파 매매라면 <em>돌파선 재이탈</em> 또는 <em>리테스트 실패</em>가 무효화 신호입니다.
        </p>
        <p>
          변동성이 큰 장에서는 구조형 손절만으로는 <em>휩쏘(살짝 찍고 되돌림)</em>에 당하기 쉬우니, 
          <strong>구조 + ATR</strong>을 함께 사용해 손절을 <em>살짝 바깥</em>에 두는 것이 유리합니다.
        </p>

        <h2 className="text-2xl font-semibold">4) 포지션 사이징: 손절과 한몸</h2>
        <p>
          손절 라인은 <strong>포지션 크기</strong>를 결정하는 기준점입니다. 
          계좌 리스크 한도(보통 <strong>1~2%</strong>)를 먼저 정한 뒤, 
          <em>진입가 ↔ 손절가</em>의 거리에 맞춰 수량을 역산하세요. 
          이렇게 해야 손절이 도달해도 계좌가 <strong>예상 가능한 범위</strong>에서만 흔들립니다.
        </p>
        <p>
          실전에서는 <a href="/calculators/losscut" className="text-blue-600 underline">손절가 계산기</a>나{" "}
          <a href="/calculators/target" className="text-blue-600 underline">목표 수익률 계산기</a>로 
          미리 시뮬레이션해 두면 매매 중 감정 개입을 줄일 수 있습니다.
        </p>

        <h2 className="text-2xl font-semibold">5) 이동 손절(Trailing)과 부분 청산</h2>
        <p>
          추세 추종 전략에서는 <strong>이동 손절</strong>이 핵심입니다. 
          ① <em>스윙로우/스윙하이</em> 갱신에 따라 손절을 끌어올리거나, 
          ② <em>단/중기 이평선</em> 하회 시 정리, 
          ③ <em>ATR 기준</em>으로 <em>진입 후 유리한 방향으로</em> 손절을 이동합니다. 
          또한 <strong>분할 청산</strong>은 감정 부담을 줄이고, 
          <em>남은 물량</em>으로 <strong>런업(추세 가속)</strong>을 노릴 여지를 남깁니다.
        </p>

        <h2 className="text-2xl font-semibold">6) 실행 디테일: 종가/장중·슬리피지·갭</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>
            <strong>종가 기준</strong> — <em>확정 신호</em>만 집행하므로 휩쏘에 강함. 
            대신 손절 폭이 조금 커질 수 있음.
          </li>
          <li>
            <strong>장중 기준</strong> — 속도는 빠르지만 <em>가짜 이탈</em>에 걸릴 확률이 높음. 
            변동성 장세에서는 주의.
          </li>
          <li>
            <strong>슬리피지</strong> — 급변동 시 손절가보다 불리하게 체결될 수 있으니, 
            리스크 계산에 <em>여유폭</em>을 반영.
          </li>
          <li>
            <strong>갭</strong> — 갭다운으로 손절가를 뛰어넘으면 시장가 체결로 더 큰 손실이 날 수 있음. 
            분산 진입·분산 청산, 이벤트 전 <em>레버리지 축소</em>로 관리.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold">7) 심리: 왜 손절을 못 지키는가</h2>
        <p>
          인간의 뇌는 손실을 이익의 <em>2배 이상</em> 크게 느낍니다(손실 회피). 
          그래서 “조금만 더 기다리면 오르겠지”라는 <strong>보유 편향</strong>에 빠집니다. 
          이를 막으려면 <strong>사전 공표</strong>가 필요합니다. 
          진입 전 손절가·손익비·부분 청산 계획을 기록하고, 
          실행 실패 시 <em>매매 일지</em>에 <strong>심리 원인</strong>을 남기세요. 
          반복되는 감정 패턴은 <em>데이터</em>로 다뤄야 개선됩니다.
        </p>

        <h2 className="text-2xl font-semibold">8) 초보자의 7가지 흔한 실수</h2>
        <ul className="list-decimal ml-6 space-y-2">
          <li><strong>손절가를 진입 후에 정함</strong> — 반드시 진입 <em>전에</em> 결정.</li>
          <li><strong>평단 낮추기(물타기)</strong> — 무효화 후 추가 진입은 <em>전략 붕괴</em>.</li>
          <li><strong>구조 아닌 감정 기준</strong> — “무섭다”가 아니라 “<em>논리 무효화</em>”로 손절.</li>
          <li><strong>포지션 과대</strong> — 손절가가 가까우면 수량을 더 줄여야 함.</li>
          <li><strong>뉴스 직후 추격</strong> — 변동성 극대화 구간에서 <em>손절 폭 급등</em>.</li>
          <li><strong>이동 손절 부재</strong> — 이익 방어 실패로 수익→손실 전환.</li>
          <li><strong>복기 없음</strong> — 실패 원인 미파악 → 같은 실수 반복.</li>
        </ul>

        <h2 className="text-2xl font-semibold">9) 체크리스트 (바로 적용)</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>내 <strong>시나리오</strong>는 무엇이며, 무엇이 무효화 신호인가?</li>
          <li>손절가 기준은 <em>구조/ATR/시간/비율</em> 중 무엇인가? 혼합 사용 여부는?</li>
          <li>계좌 리스크 한도(1~2%)와 포지션 크기는 일치하는가?</li>
          <li>종가/장중 실행 원칙을 명시했고, 예외 조건이 있는가?</li>
          <li>이동 손절·부분 청산 규칙이 준비되어 있는가?</li>
          <li>이 매매가 실패하면 일지에 무엇을 기록할 것인가?</li>
        </ul>

        <h2 className="text-2xl font-semibold">10) 예시 템플릿 (복붙해서 쓰기)</h2>
        <pre className="bg-gray-100 rounded-lg p-4 text-sm whitespace-pre-wrap">{`[전략] 상승 추세 눌림 매수
- 진입 근거: 20일선 지지 + 전고 돌파 후 리테스트
- 손절: 최근 스윙로우 종가 이탈(확정)
- 이동 손절: 스윙로우 상승 시 따라올림
- 부분 청산: 전고/확장채널 상단에서 30%·30%, 나머지는 추세 종료까지
- 포지션: 계좌의 1.5% 리스크 기준으로 수량 역산
- 예외: 실적/빅뉴스 전에는 절반 축소

[전략] 돌파 매매
- 진입 근거: 거래량 동반 돌파 + 리테스트 성공
- 손절: 돌파선 종가 재이탈
- 이동 손절: 10/20일선 하회 시 정리
- 부분 청산: 돌파 폭의 1R·2R에서 각각 1/3 청산
- 포지션: 1% 리스크 기준
`}</pre>

        <h2 className="text-2xl font-semibold">11) 차트게임으로 규칙 체화하기</h2>
        <p>
          규칙은 <strong>체험</strong>해야 내 것이 됩니다. 
          👉 <a href="/game" className="text-blue-600 underline">차트게임</a>에서 
          <em>진입 전 손절가 고정</em> → <em>이동 손절</em> → <em>부분 청산</em>을 
          50턴 동안 루틴으로 연습해보세요. 
          매판 결과를 <a href="/posts/trading-journal" className="text-blue-600 underline">매매 일지</a>에 기록하면 
          손절 실패의 원인을 빠르게 줄일 수 있습니다.
        </p>

        <h2 className="text-2xl font-semibold">12) 마무리</h2>
        <p>
          손절은 패배 선언이 아닙니다. <strong>전략의 일부분</strong>입니다. 
          “논리 무효화 지점에, 감당 가능한 손실로, 자동 실행되도록” 만드는 순간 
          계좌의 변동성이 안정되고, 큰 기회를 잡을 체력이 생깁니다. 
          오늘부터 모든 매매에 손절 라인을 <strong>먼저</strong> 그려두세요. 
          그것이 <em>프로세스 중심 투자</em>의 출발점입니다.
        </p>

        <p className="text-sm text-gray-600 mt-6">
          관련글 보기:{" "}
          <a href="/posts/common-mistakes" className="text-blue-600 underline">초보자가 자주 하는 실수 TOP 5</a>
          {" , "}
          <a href="/posts/risk-management" className="text-blue-600 underline">리스크 관리의 기본</a>
          {" , "}
          <a href="/calculators/losscut" className="text-blue-600 underline">손절가 계산기</a>
        </p>
      </section>
    </main>
  );
}
