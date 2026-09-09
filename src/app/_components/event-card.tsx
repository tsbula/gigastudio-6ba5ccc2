import { Clock, MapPin, UserCheck, Users } from "lucide-react";
import Link from "next/link";

import { EventStatusBadge } from "@/app/_components/event-status-badge";
import { Progress } from "@/components/ui/progress";
import type { VolleyEvent } from "@/lib/db";
import type { EventStatus } from "@/lib/events";
import {
  formatEventDate,
  formatEventDayShort,
  formatEventTimeRange,
  formatEventWeekday,
} from "@/lib/events";
import { cn } from "@/lib/utils";

export type EventCardData = {
  event: VolleyEvent;
  active: number;
  waiting: number;
  status: EventStatus;
  myStatus: "active" | "waitlist" | null;
};

export function EventCard({ data }: { data: EventCardData }) {
  const { event, active, waiting, status, myStatus } = data;
  const fillPct = Math.min(100, Math.round((active / event.maxPlayers) * 100));

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border bg-secondary/60 leading-none">
          <span className="text-xl font-bold">{formatEventDayShort(event.startsAt).split(" ")[0]}</span>
          <span className="mt-1 text-[11px] font-medium uppercase text-muted-foreground">
            {formatEventWeekday(event.startsAt)}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <EventStatusBadge status={status} />
          {myStatus && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                myStatus === "active"
                  ? "bg-success/10 text-success"
                  : "bg-accent/20 text-accent-foreground"
              )}
            >
              <UserCheck className="h-3 w-3" aria-hidden />
              {myStatus === "active" ? "Вы записаны" : `Вы в резерве`}
            </span>
          )}
        </div>
      </div>

      <h3 className="mt-4 text-base font-semibold leading-snug group-hover:underline underline-offset-4">
        {event.title}
      </h3>

      <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground/80">{formatEventDate(event.startsAt)}</p>
        <p className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {formatEventTimeRange(event)}
        </p>
        <p className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="line-clamp-1">{event.address}</span>
        </p>
      </div>

      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {active} из {event.maxPlayers}
          </span>
          {waiting > 0 && (
            <span className="text-accent-foreground">+{waiting} в резерве</span>
          )}
        </div>
        <Progress value={fillPct} className="h-1.5" />
      </div>
    </Link>
  );
}
