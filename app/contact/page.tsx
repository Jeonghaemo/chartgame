export default function ContactPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 text-gray-800">
      <h1 className="text-2xl font-bold mb-6">문의하기</h1>
      <p className="mb-4">
        차트게임 서비스 관련 문의, 버그 신고, 제휴 및 광고 제안은 아래 이메일로 연락해주세요.
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
        <p className="text-gray-700">
          📧 이메일: <a href="diekgg@naver.com" className="text-blue-600 underline">diekgg@naver.com</a>
        </p>
      </div>

      <p className="text-sm text-gray-500">
        가능한 한 빠르게 답변드리며, 문의 내용은 서비스 개선에 반영될 수 있습니다.
      </p>
    </main>
  );
}
