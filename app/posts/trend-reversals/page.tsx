// app/posts/trend-reversals/page.tsx

export default function TrendReversalsPost() {
  return (
    <main className="max-w-3xl mx-auto p-6 leading-relaxed">
      <h1 className="text-3xl font-bold mb-8">
        실전 차트 예시로 배우는 추세 전환 패턴 5가지
      </h1>

      <section className="space-y-8">
        <p>
          추세 전환은 시장의 <strong>에너지 이동</strong>이 차트에 새겨지는 순간입니다.
          단일 캔들 신호만으로는 신뢰도가 낮지만, <strong>가격 구조</strong>(고저점 패턴)와{" "}
          <strong>거래량</strong>, <strong>리테스트</strong>가 맞물리면 확률이 높아집니다.
          이 글에서는 실전에서 가장 재현성이 높은 5가지 전환 패턴을
          <strong>진입·손절·목표·실수 방지</strong> 기준과 함께 정리했습니다.
          각 패턴은 <a href="/posts/chart-basics" className="text-blue-600 underline">차트 기본</a>과{" "}
          <a href="/posts/market-cycles" className="text-blue-600 underline">시장 사이클</a> 이해를 바탕으로 적용하세요.
        </p>

        <h2 className="text-2xl font-semibold">1) 더블 바텀 / 더블 탑 (W / M 구조)</h2>
        <p>
          하락 추세에서 <strong>전저 재시험 후 반등</strong>해 W를 만들면 더블 바텀,
          상승 추세에서 <strong>전고 재도전 실패</strong>로 M을 만들면 더블 탑입니다.
          핵심은 두 번째 바닥(또는 꼭대기)에서 <strong>침투 깊이 감소</strong>와{" "}
          <strong>반등/되돌림의 질</strong>입니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>트리거</strong>: 넥라인(중간 고점/저점) 돌파 종가 확정</li>
          <li><strong>손절</strong>: 두 번째 바닥(꼭대기) 하회(상회) 확정 또는 최근 스윙로우/하이</li>
          <li><strong>목표</strong>: 패턴 높이만큼(넥라인↔바닥/꼭대기) 1차, 리테스트 성공 시 2차 연장</li>
          <li><strong>거래량</strong>: 돌파/이탈 시 증가하면 신뢰도↑</li>
        </ul>
        <p>
          <em>자주 하는 실수:</em> 넥라인 돌파 전 선진입. →{" "}
          <strong>돌파 종가 확정</strong>과 <strong>리테스트</strong>를 선호하세요.
        </p>

        <h2 className="text-2xl font-semibold">2) 헤드앤숄더 / 역헤드앤숄더</h2>
        <p>
          상승 추세 피로가 누적될 때는 <strong>좌·우 어깨</strong>가 비슷한 높이로 만들어지고
          <strong>머리(Head)</strong>에서 마지막 고점 갱신 후 실패가 나타납니다.
          반대로 하락 추세 바닥에서는 역헤드앤숄더가 출현합니다.
          <strong>넥라인 기울기</strong>와 <strong>거래량 비대칭</strong>(머리 구간 과열, 우측 어깨 약화)을 유심히 보세요.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>트리거</strong>: 넥라인 종가 돌파(역H&S 상승), 이탈(H&S 하락)</li>
          <li><strong>손절</strong>: 우측 어깨 저점(고점) 붕괴 시</li>
          <li><strong>목표</strong>: 머리↔넥라인 높이만큼 1차, 추세선 교차/구조 저항에서 분할</li>
          <li><strong>리테스트</strong>: 넥라인 되돌림 확인 시 <strong>재진입</strong> 기회</li>
        </ul>
        <p>
          <em>팁:</em> 넥라인이 <strong>상방 기울기</strong>면 역헤드앤숄더의 신뢰도가,
          <strong>하방 기울기</strong>면 헤드앤숄더의 신뢰도가 상대적으로 높습니다.
        </p>

        <h2 className="text-2xl font-semibold">3) 하락 쐐기 / 상승 쐐기 (Falling / Rising Wedge)</h2>
        <p>
          쐐기는 수렴형 채널로, <strong>추세 에너지 고갈</strong>을 시사합니다.
          하락 쐐기(Falling)는 저점과 고점이 모두 낮아지지만, 하강 각도가 점점 둔화합니다.
          보통 <strong>상방 이탈</strong>로 마무리되며 추세 전환 신호가 됩니다.
          상승 쐐기는 반대 논리로 <strong>하방 이탈</strong> 가능성을 높입니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>트리거</strong>: 상단(하단) 추세선 종가 돌파(이탈)</li>
          <li><strong>손절</strong>: 이탈/돌파 직전 스윙로우/하이 또는 쐐기 내부 재진입</li>
          <li><strong>목표</strong>: 직전 구조 저항/지지, 혹은 쐐기 높이의 50~100%</li>
          <li><strong>거래량</strong>: 이탈 순간의 볼륨 스파이크 확인</li>
        </ul>
        <p>
          <em>주의:</em> 채널과 혼동하지 마세요. 쐐기는 <strong>수렴</strong>하며
          상·하단 추세선 간격이 좁아집니다.
        </p>

        <h2 className="text-2xl font-semibold">4) 컵앤핸들 (Rounding Bottom + Pullback)</h2>
        <p>
          장기간의 <strong>라운딩 바닥</strong> 형성 후 고점 부근에서 짧은 조정(핸들)을 거쳐
          <strong>추세 전환</strong>과 가속이 나옵니다. 성장주 중장기 패턴으로 자주 등장합니다.
          핵심은 컵의 <strong>대칭성</strong>과 핸들의 <strong>얕은 조정</strong>(보통 1/3~1/2)입니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>트리거</strong>: 컵 상단(전고) 돌파 종가</li>
          <li><strong>손절</strong>: 핸들 저점 이탈 또는 전고 아래 재진입</li>
          <li><strong>목표</strong>: 컵 깊이만큼 1차, 섹터 모멘텀 좋으면 추세 추종</li>
          <li><strong>리테스트</strong>: 전고 되돌림에서 지지가 나오면 신뢰도↑</li>
        </ul>
        <p>
          <em>실수 방지:</em> 컵의 <strong>좌우 비대칭이 과도</strong>하거나
          핸들이 <strong>너무 길고 깊을 때</strong>는 확률이 낮아집니다.
        </p>

        <h2 className="text-2xl font-semibold">5) 클라이맥스 바 & 스프링/업스러스트</h2>
        <p>
          추세 말단에서 등장하는 <strong>이상 거래량</strong>과 <strong>장대 바</strong>는
          에너지 소진의 신호가 될 수 있습니다.
          바닥에서는 지지 하단을 <strong>짧게 깼다가(스프링)</strong> 빠르게 복귀하고,
          천장에서는 저항 상단을 <strong>짧게 넘겼다가(업스러스트)</strong> 다시 하회합니다.
          구조 바깥으로 <strong>짧은 침투</strong> 후 되돌림이 핵심입니다.
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>트리거</strong>: 침투 직후 <strong>복귀 캔들</strong> 확정(엔귤핑/핀바 등)</li>
          <li><strong>손절</strong>: 침투 저점(고점) 재이탈</li>
          <li><strong>목표</strong>: 박스 중단/반대변, 추세선 교차 구간 분할</li>
          <li><strong>심리</strong>: 막판 공포/탐욕 과열이 절정일 때 출현</li>
        </ul>
        <p>
          <em>주의:</em> 단독 신호보다 <strong>박스/채널 경계</strong>와 결합할 때만 사용하세요.
        </p>

        <h2 className="text-2xl font-semibold">전환 패턴 공통 체크리스트</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>상위 주기(주봉/일봉)와 <strong>방향 합치</strong> 확인 — 역풍이면 보수적 접근</li>
          <li>돌파/이탈은 <strong>종가 확정</strong> 우선, 가능하면 <strong>리테스트</strong> 선호</li>
          <li><strong>거래량</strong> 동반 여부 — 패턴 완성 시 볼륨 체크</li>
          <li>손절은 <strong>구조 무효화</strong> 지점에, 수량은 계좌 리스크 1~2% 기준 역산</li>
          <li>과열/과매도 구간에서는 <strong>부분 청산</strong>으로 리스크 관리</li>
        </ul>

        <h2 className="text-2xl font-semibold">실전 적용 루틴 (복붙 가이드)</h2>
        <pre className="bg-gray-100 rounded-lg p-4 text-sm whitespace-pre-wrap">{`[패턴 인식]
- 후보: 더블 바텀/탑, (역)헤드앤숄더, 쐐기, 컵앤핸들, 스프링/업스러스트
- 상위 주기 방향: 상승/하락/횡보 중 무엇인가?

[트리거]
- 종가 확정으로만 집행 (돌파/이탈/복귀)
- 리테스트 성공 시 추가진입 또는 비중 전환

[리스크]
- 손절: 구조 무효화 지점 (스윙로우/하이, 넥라인 재이탈 등)
- 수량: 계좌 1~2% 리스크 기준 역산 (손절 폭 고려)

[청산]
- 1R/2R, 구조 저항/지지, 패턴 목표치에서 분할
- 이동 손절: 스윙로우/하이 갱신에 따라 끌어올림

[복기]
- 성공/실패 공통점, 거래량/리테스트의 영향 기록
- 다음 매매 개선 목표 1~2개 명시`}</pre>

        <h2 className="text-2xl font-semibold">차트게임에서 전환 패턴 훈련하기</h2>
        <p>
          👉 <a href="/game" className="text-blue-600 underline">차트게임</a>에서
          하락장에는 <strong>더블 바텀·역헤드앤숄더</strong>, 상승장에는{" "}
          <strong>더블 탑·헤드앤숄더</strong>, 박스장에는 <strong>스프링/업스러스트</strong>를
          의도적으로 찾아 연습해보세요. 50턴 제한 덕분에 <strong>선택적 매매</strong>가 체화됩니다.
          매판 결과는 <a href="/posts/trading-journal" className="text-blue-600 underline">매매 일지</a>로 복기하면
          전환 패턴의 성공 조건을 빠르게 축적할 수 있습니다.
        </p>

        <h2 className="text-2xl font-semibold">마무리</h2>
        <p>
          전환 패턴은 <strong>상황</strong>이 만든 결과입니다.
          패턴 모양만 외우지 말고, 그 배경인 <strong>수급·거래량·리테스트</strong>를 함께 보세요.
          동일 패턴이라도 <strong>레짐</strong>이 다르면 승률과 손익비가 달라집니다.
          항상 <a href="/posts/stop-loss-mastery" className="text-blue-600 underline">손절 라인</a>을 먼저 정하고,
          <a href="/posts/market-cycles" className="text-blue-600 underline">시장 사이클</a>과 합치는 순간에만
          화력을 집중하는 것이 장기 성과를 만듭니다.
        </p>

        <p className="text-sm text-gray-600 mt-6">
          관련글 보기:{" "}
          <a href="/posts/chart-basics" className="text-blue-600 underline">차트 보는 법 (기본편)</a>
          {" , "}
          <a href="/posts/market-cycles" className="text-blue-600 underline">시장 사이클 완전 정리</a>
          {" , "}
          <a href="/posts/trading-journal" className="text-blue-600 underline">주식 매매 일지 쓰는 법</a>
        </p>
      </section>
    </main>
  );
}
