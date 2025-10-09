export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 text-gray-800">
      <h1 className="text-2xl font-bold mb-6">이용약관</h1>
      <p className="mb-4">
        본 약관은 차트게임(chartgame.co.kr, 이하 “사이트”)이 제공하는 모든 서비스의 이용조건 및 절차,
        이용자와 사이트 간의 권리·의무 및 책임사항을 규정합니다.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. 목적</h2>
      <p>이 약관은 사이트 이용과 관련된 기본적인 사항을 규정함을 목적으로 합니다.</p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. 서비스의 성격</h2>
      <p className="mb-4">
        본 서비스는 가상자본을 이용한 모의투자 게임 및 투자 학습 콘텐츠를 제공합니다.
        실제 금융투자를 권유하거나 중개하지 않으며, 모든 데이터는 참고용입니다.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. 회원가입 및 계정관리</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>회원은 Google 계정을 이용해 로그인할 수 있습니다.</li>
        <li>회원정보의 정확성과 관리 책임은 이용자 본인에게 있습니다.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. 서비스 이용</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>이용자는 서비스 내에서 하트를 사용해 게임을 시작할 수 있습니다.</li>
        <li>광고 참여를 통한 하트 충전은 제휴정책을 준수합니다.</li>
        <li>사이트는 서비스 개선을 위해 기능을 변경·중단할 수 있습니다.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. 면책사항</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>사이트는 모의투자 결과에 따른 손익에 책임을 지지 않습니다.</li>
        <li>서비스 오류·서버 장애로 인한 손해에 대해 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. 저작권</h2>
      <p>사이트 내 콘텐츠(텍스트, 이미지, 코드)는 저작권법의 보호를 받으며, 무단 복제 및 배포를 금합니다.</p>

      <p className="mt-8 text-sm text-gray-500">
        본 약관은 2025년 10월 10일부터 시행됩니다.
      </p>
    </main>
  );
}
