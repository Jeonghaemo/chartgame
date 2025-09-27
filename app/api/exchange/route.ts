export const revalidate = 86400; // 24h: 전일(이전 거래일) 기준으로 1일 1회 캐싱

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = (searchParams.get("from") || "USD").toUpperCase();
    const to = (searchParams.get("to") || "KRW").toUpperCase();
    const amount = parseFloat(searchParams.get("amount") || "1");

    if (!Number.isFinite(amount) || amount < 0) {
      return new Response(JSON.stringify({ error: "amount 파라미터가 유효하지 않습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 동일 통화면 즉시 반환
    if (from === to) {
      return new Response(JSON.stringify({
        base: from,
        rate: 1,
        result: amount,
        date: new Date().toISOString().slice(0, 10),
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = `https://open.er-api.com/v6/latest/${from}`;
    // 하루 1회 재검증 (Next.js 캐시) -> 전일/이전 거래일 환율로 동작
    const res = await fetch(url, { next: { revalidate: 86400 } });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "환율 제공 서버 응답이 비정상입니다." }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json() as {
      result?: string;
      base_code?: string;
      time_last_update_utc?: string;
      rates?: Record<string, number>;
      ["error-type"]?: string;
    };

    if (data.result !== "success" || !data.rates || typeof data.rates[to] !== "number") {
      const reason = data["error-type"] || "해당 통화를 지원하지 않습니다.";
      return new Response(JSON.stringify({ error: reason }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rate = data.rates[to];
    const result = rate * amount;

    // 날짜(UTC 문자열 → YYYY-MM-DD 추출)
    const date = data.time_last_update_utc
      ? new Date(data.time_last_update_utc).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    return new Response(JSON.stringify({
      base: data.base_code || from,
      rate,
      result,
      date,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "환율 정보를 불러오는 중 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
