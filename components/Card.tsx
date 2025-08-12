export default function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl bg-white shadow-sm ring-1 ring-gray-200", className)}>{children}</div>;
}

// 간단한 className merge
export function cn(...x: (string | undefined | false)[]) {
  return x.filter(Boolean).join(" ");
}
