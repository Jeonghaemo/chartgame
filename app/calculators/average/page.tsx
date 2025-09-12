import AverageClient from "./page.client";
import meta from "./metadata";

export const metadata = meta;

export default function Page() {
  return (
    <main className="min-h-[70vh] px-4 py-8 max-w-[900px] mx-auto">
      <h1 className="text-2xl font-bold">평단가 계산기</h1>
      <AverageClient />
    </main>
  );
}
