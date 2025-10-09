export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 text-gray-800">
      <h1 className="text-2xl font-bold mb-6">개인정보처리방침</h1>
      <p className="mb-4">
        차트게임(chartgame.co.kr)은 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
        본 방침은 이용자가 서비스를 이용함에 있어 제공한 개인정보가 어떻게 수집·이용·보호되는지를 안내합니다.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. 수집하는 개인정보 항목</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>회원가입 시: 이메일 주소, 닉네임, 로그인 계정(Google OAuth 등)</li>
        <li>자동 수집: 접속 IP, 쿠키, 서비스 이용기록(광고 노출·클릭, 게임 기록 등)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. 개인정보의 이용 목적</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>서비스 제공 및 이용자 식별</li>
        <li>광고 및 제휴 리워드 기능 제공</li>
        <li>부정 이용 방지, 통계·분석 및 서비스 개선</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. 개인정보의 보유 및 이용기간</h2>
      <p className="mb-4">
        회원 탈퇴 시 즉시 파기하며, 관련 법령에 따라 일정 기간 보관이 필요한 경우
        해당 기간 동안 최소한의 정보만 보관합니다.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. 제3자 제공 및 위탁</h2>
      <p className="mb-4">
        차트게임은 원칙적으로 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
        다만 서비스 운영을 위해 다음과 같이 위탁할 수 있습니다.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>인증 및 로그인: Google LLC (Google OAuth)</li>
        <li>호스팅: Vercel Inc.</li>
        <li>데이터베이스: Neon.tech (PostgreSQL)</li>
        <li>통계 및 광고: Google AdSense / Google Analytics</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. 이용자의 권리</h2>
      <p className="mb-4">
        이용자는 언제든지 자신의 개인정보를 조회·수정·삭제할 수 있으며,
        문의 페이지를 통해 관련 요청을 할 수 있습니다.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. 문의처</h2>
      <p>이메일: <a href="mailto:diekgg@naver.com" className="text-blue-600 underline">diekgg@naver.com</a></p>

      <p className="mt-8 text-sm text-gray-500">
        본 방침은 2025년 10월 10일에 제정되었으며, 변경 시 공지 후 시행됩니다.
      </p>
    </main>
  );
}
