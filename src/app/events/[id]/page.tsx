import { ArrowLeft, Clock, Hourglass, Info, MapPin, ShieldAlert, UserRound, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminControls } from "@/app/events/[id]/_components/admin-controls";
import {
  EventActions,
  type EventActionsMode,
} from "@/app/events/[id]/_components/event-actions";
import {
  SignupList,
  type SignupRow,
} from "@/app/events/[id]/_components/signup-lists";
import { EventStatusBadge } from "@/app/_components/event-status-badge";
import { getCurrentUser } from "@/lib/auth";
import { withDb } from "@/lib/db";
import {
  AUTO_CANCEL_HOURS,
  WITHDRAW_DEADLINE_HOURS,
  WITHDRAW_DEADLINE_WITH_RESERVE_HOURS,
  activeCount,
  cancelReasonLabel,
  eventEnd,
  formatEventDate,
  formatEventTimeRange,
  fullName,
  getEventStatus,
  getSignups,
  parseStart,
  withdrawBlockReason,
} from "@/lib/events";

export const dynamic = "force-dynamic";

async function getEventPage(id: string) {
  return withDb((db) => {
    const event = db.events.find((e) => e.id === id);
    if (!event) return null;
    const organizer = db.users.find((u) => u.id === event.createdBy);
    const { active, waitlist } = getSignups(db, event.id);
    const toRow = (userId: string): SignupRow | null => {
      const u = db.users.find((x) => x.id === userId);
      if (!u) return null;
      return {
        userId: u.id,
        name: fullName(u),
        isLegionnaire: u.graduationYear === null,
        isYou: false,
      };
    };
    return {
      event,
      organizerName: organizer ? fullName(organizer) : "Организатор",
      activeRows: active.map((s) => ({ ...toRow(s.userId)! })),
      waitRows: waitlist.map((s) => ({ ...toRow(s.userId)! })),
      active: activeCount(db, event.id),
      waiting: waitlist.length,
    };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getEventPage(id);
  return {
    title: data ? data.event.title : "Тренировка",
    description: data
      ? `${formatEventDate(data.event.startsAt)}, ${formatEventTimeRange(data.event)}. ${data.event.address}`
      : undefined,
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, data] = await Promise.all([getCurrentUser(), getEventPage(id)]);
  if (!data) notFound();

  const { event, organizerName } = data;
  const activeRows = data.activeRows.map((r) => ({
    ...r,
    isYou: user?.id === r.userId,
  }));
  const waitRows = data.waitRows.map((r) => ({
    ...r,
    isYou: user?.id === r.userId,
  }));

  const now = new Date();
  const start = parseStart(event.startsAt);
  const status = getEventStatus(event, data.active, now);

  // Режим кнопки действия
  let mode: EventActionsMode;
  let withdrawBlock: string | null = null;
  let withdrawHint: string | null = null;
  let closedNote: string | null = null;

  if (event.cancelled) {
    mode = "closed";
    closedNote = "Тренировка отменена — запись не ведётся.";
  } else if (now >= start) {
    mode = "closed";
    closedNote =
      now >= eventEnd(event)
        ? "Тренировка завершилась."
        : "Тренировка уже идёт — запись закрыта.";
  } else {
    const signup = user
      ? data.activeRows.some((r) => r.userId === user.id)
        ? ("active" as const)
        : data.waitRows.some((r) => r.userId === user.id)
          ? ("waitlist" as const)
          : null
      : null;
    if (!user) {
      mode = "login";
    } else if (signup === "active") {
      mode = "withdraw";
      const waiting = data.waiting;
      const hoursLeft =
        waiting > 0 ? WITHDRAW_DEADLINE_WITH_RESERVE_HOURS : WITHDRAW_DEADLINE_HOURS;
      withdrawHint = `Выписаться можно не позднее чем за ${hoursLeft} ${
        waiting > 0 ? "часа" : "часа"
      } до начала${waiting > 0 ? " — в резерве есть люди" : ""}.`;
      withdrawBlock = withdrawBlockReason(event, waiting, now);
    } else if (signup === "waitlist") {
      mode = "leaveWaitlist";
    } else {
      mode = data.active < event.maxPlayers ? "join" : "reserve";
    }
  }

  const myWaitIndex = waitRows.findIndex((r) => r.isYou) + 1;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Все тренировки
      </Link>

      <div className="mt-4 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <EventStatusBadge status={status} />
          {event.cancelled && event.cancelReason && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-0.5 text-xs font-semibold text-destructive">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
              Причина: {cancelReasonLabel(event.cancelReason)}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {event.title}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <UserRound className="h-4 w-4" aria-hidden />
          Организатор: {organizerName}
        </p>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Дата
            </dt>
            <dd className="mt-1 font-medium">{formatEventDate(event.startsAt)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Hourglass className="h-3.5 w-3.5" aria-hidden />
              Время
            </dt>
            <dd className="mt-1 font-medium">
              {formatEventTimeRange(event)} · {event.durationMin} мин
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Адрес
            </dt>
            <dd className="mt-1 font-medium">{event.address}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Состав
            </dt>
            <dd className="mt-1 font-medium">
              {data.active} из {event.maxPlayers} · минимум {event.minPlayers}
            </dd>
          </div>
        </dl>

        {event.description && (
          <p className="mt-6 whitespace-pre-line border-t pt-5 text-sm leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        )}

        {myWaitIndex > 0 && (
          <p className="mt-6 rounded-lg bg-accent/15 px-4 py-3 text-sm font-medium text-accent-foreground">
            Вы в резерве под номером {myWaitIndex}: как только кто-то из участников
            выписывается, вы автоматически занимаете его место.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t pt-6">
          <EventActions
            eventId={event.id}
            mode={mode}
            withdrawBlockReason={withdrawBlock}
            withdrawDeadlineHint={withdrawHint}
            closedNote={closedNote}
          />
        </div>

        {user?.isAdmin && (
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            <AdminControls
              eventId={event.id}
              cancellable={!event.cancelled}
            />
          </div>
        )}
      </div>

      {/* Информационный блок */}
      <div className="mt-6 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1.5 text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Выписка.</span> Участник
            может выписаться не позднее чем за {WITHDRAW_DEADLINE_HOURS} часа до
            начала; если в резерве кто-то есть — за{" "}
            {WITHDRAW_DEADLINE_WITH_RESERVE_HOURS} часа. Резервист может отказаться
            в любое время до начала.
          </p>
          <p>
            <span className="font-medium text-foreground">Автоотмена.</span> Если за{" "}
            {AUTO_CANCEL_HOURS} часа до начала участников меньше минимума (
            {event.minPlayers}), тренировка отменяется автоматически с пометкой
            «не набрался минимум».
          </p>
        </div>
      </div>

      {/* Списки */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <SignupList
          title="Участники"
          counter={`${data.active} из ${event.maxPlayers}`}
          rows={activeRows}
          emptyText="Пока никто не записался — будьте первым"
        />
        <SignupList
          title="Резерв"
          counter={data.waiting > 0 ? `${data.waiting} в очереди` : undefined}
          rows={waitRows}
          numbered
          emptyText="Резерв пуст — основные места ещё свободны"
        />
      </div>
    </div>
  );
}
