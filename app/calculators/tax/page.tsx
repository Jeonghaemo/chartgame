import meta from "./metadata";
import dynamic from "next/dynamic";

export const metadata = meta;

const TaxCalculator = dynamic(() => import("./page.client"), { ssr: false });

export default function Page() {
  return <TaxCalculator />;
}
