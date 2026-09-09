import Link from "next/link";

import { SiteLogo } from "@/components/site-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/50">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <SiteLogo className="flex items-center gap-2.5 [&>span:last-child>span:first-child]:text-base" />
        <p className="text-center">
          Запись на волейбольные тренировки для компании выпускников.{" "}
          <Link
            href="/#rules"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Правила записи и выписки
          </Link>
        </p>
      </div>
    </footer>
  );
}
