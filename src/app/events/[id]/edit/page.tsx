import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateEvent } from "@/app/actions";
import {
  EventForm,
  type EventFormDefaults,
} from "@/app/events/_components/event-form";
import { getCurrentUser } from "@/lib/auth";
import { withDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редактирование тренировки",
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const event = await withDb((db) =>
    db.events.find((e) => e.id === id) ?? null
  );
  if (!event) notFound();

  const defaults: EventFormDefaults = {
    title: event.title,
    address: event.address,
    startsAt: event.startsAt,
    durationMin: String(event.durationMin),
    minPlayers: String(event.minPlayers),
    maxPlayers: String(event.maxPlayers),
    description: event.description,
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href={`/events/${event.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        К тренировке
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        Редактирование тренировки
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Изменения сразу увидят все записавшиеся: состав и статусы пересчитаются
        автоматически.
      </p>
      <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <EventForm
          action={updateEvent.bind(null, event.id)}
          defaults={defaults}
          submitLabel="Сохранить изменения"
        />
      </div>
    </div>
  );
}
