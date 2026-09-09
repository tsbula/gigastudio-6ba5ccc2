import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { logout } from "@/app/actions";
import { SiteLogo } from "@/components/site-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/lib/events";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <SiteLogo />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:border-ring/50"
                title="Профиль"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials(user)}
                </span>
                <span className="hidden max-w-[10rem] truncate sm:block">
                  {user.firstName} {user.lastName}
                </span>
                {user.isAdmin && (
                  <ShieldCheck
                    className="h-4 w-4 text-accent"
                    aria-label="Админ"
                  />
                )}
              </Link>
              <form action={logout}>
                <Button
                  variant="ghost"
                  size="icon"
                  type="submit"
                  aria-label="Выйти"
                  title="Выйти"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Войти</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
