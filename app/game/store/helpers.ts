export function valuation(cash: number, shares: number, last?: number) {
  const mkt = (last ?? 0) * (shares ?? 0);
  return { market: mkt, total: Math.floor((cash ?? 0) + mkt) };
}
export function pnlPct(initial: number, total: number) {
  return ((total - initial) / initial) * 100;
}
