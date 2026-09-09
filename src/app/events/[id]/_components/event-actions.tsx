"use client";

import { Loader2, LogIn, UserPlus, UserX, UsersRound } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { joinEvent, leaveEvent, leaveWaitlist } from "@/app/actions";
import { Button } from "@/components/ui/button";

export type EventActionsMode =
  | "login"
  | "join"
  | "reserve"
  | "withdraw"
  | "leaveWaitlist"
  | "closed";

export function EventActions({
  eventId,
  mode,
  withdrawBlockReason,
  withdrawDeadlineHint,
  closedNote,
}: {
  eventId: string;
  mode: EventActionsMode;
  withdrawBlockReason: string | null;
  withdrawDeadlineHint: string | null;
  closedNote: string | null;
}) {
  const [pending, startTransition] = useTransition();

  const run = (action: (id: string) => Promise<{ ok?: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await action(eventId);
      if (!res.ok && res.error) toast.error(res.error);
    });
  };

  if (mode === "login") {
    return (
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" aria-hidden />
          Войти, чтобы записаться
        </Link>
      </Button>
    );
  }

  if (mode === "closed") {
    return (
      <p className="text-sm text-muted-foreground">{closedNote ?? "Запись закрыта"}</p>
    );
  }

  if (mode === "withdraw") {
    return (
      <div className="space-y-2">
        <Button
          variant="destructive"
          size="lg"
          className="w-full sm:w-auto"
          disabled={pending || withdrawBlockReason !== null}
          onClick={() => run(leaveEvent)}
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UserX className="mr-2 h-4 w-4" aria-hidden />
          )}
          Выписаться
        </Button>
        <p className="text-sm text-muted-foreground">
          {withdrawBlockReason ?? withdrawDeadlineHint}
        </p>
      </div>
    );
  }

  if (mode === "leaveWaitlist") {
    return (
      <Button
        variant="outline"
        size="lg"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() => run(leaveWaitlist)}
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <UserX className="mr-2 h-4 w-4" aria-hidden />
        )}
        Отказаться от резерва
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() => run(joinEvent)}
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" aria-hidden />
        )}
        {mode === "join" ? "Записаться на тренировку" : "Записаться в резерв"}
      </Button>
      {mode === "reserve" && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <UsersRound className="h-4 w-4" aria-hidden />
          Основные места заняты — попадёте в очередь резерва
        </p>
      )}
    </div>
  );
}
