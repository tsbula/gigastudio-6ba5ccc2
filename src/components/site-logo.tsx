import { Volleyball } from "lucide-react";
import Link from "next/link";

export function SiteLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={className ?? "flex items-center gap-2.5"}
      aria-label="СЕТ — на главную"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Volleyball className="h-5 w-5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-bold tracking-tight">СЕТ</span>
        <span className="hidden text-[11px] font-medium uppercase tracking-widest text-muted-foreground sm:block">
          волейбол выпускников
        </span>
      </span>
    </Link>
  );
}
