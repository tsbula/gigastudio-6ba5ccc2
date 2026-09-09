import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createEvent } from "@/app/actions";
import {
  EMPTY_EVENT_DEFAULTS,
  EventForm,
} from "@/app/events/_components/event-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Новая тренировка",
  description: "Создание волейбольной тренировки: место, время, состав.",
};

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Назад
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Новая тренировка</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Заполните детали — тренировка сразу появится в списке ближайших.
      </p>
      <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <EventForm
          action={createEvent}
          defaults={EMPTY_EVENT_DEFAULTS}
          submitLabel="Создать тренировку"
        />
      </div>
    </div>
  );
}
