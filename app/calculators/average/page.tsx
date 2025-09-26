// app/calculators/average/page.tsx
import meta from "./metadata";
import dynamic from "next/dynamic";

export const metadata = meta;

const AverageCalculator = dynamic(() => import("./page.client"), { ssr: false });

export default function Page() {
  return <AverageCalculator />;
}
