import {
  AlarmClock,
  ArrowUpCircle,
  CalendarCheck,
  CalendarX2,
  Plus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EventCard, type EventCardData } from "@/app/_components/event-card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { withDb } from "@/lib/db";
import {
  AUTO_CANCEL_HOURS,
  WITHDRAW_DEADLINE_HOURS,
  WITHDRAW_DEADLINE_WITH_RESERVE_HOURS,
  activeCount,
  eventEnd,
  findUserSignup,
  getEventStatus,
  getSignups,
  parseStart,
} from "@/lib/events";

export const dynamic = "force-dynamic";

const RULES = [
  {
    icon: CalendarCheck,
    title: "Запись до старта",
    text: "Запись открыта до начала тренировки. Если основные места заняты — вы попадаете в резерв, в общую очередь.",
  },
  {
    icon: ArrowUpCircle,
    title: "Резерв — первым в состав",
    text: "Когда участник выписывается, первый резервист автоматически занимает его место — без ручных переносов.",
  },
  {
    icon: AlarmClock,
    title: "Дедлайн выписки",
    text: `Выписаться можно не позднее чем за ${WITHDRAW_DEADLINE_HOURS} часа до начала. Если в резерве кто-то есть — за ${WITHDRAW_DEADLINE_WITH_RESERVE_HOURS} часа.`,
  },
  {
    icon: CalendarX2,
    title: "Автоотмена",
    text: `Если за ${AUTO_CANCEL_HOURS} часа до начала участников меньше минимума, тренировка отменяется автоматически с пометкой «не набрался минимум».`,
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  const cards = await withDb((db): EventCardData[] => {
    const now = new Date();
    return db.events
      .filter((e) => !e.cancelled && eventEnd(e).getTime() > now.getTime())
      .sort(
        (a, b) => parseStart(a.startsAt).getTime() - parseStart(b.startsAt).getTime()
      )
      .map((event) => {
        const { waitlist } = getSignups(db, event.id);
        return {
          event,
          active: activeCount(db, event.id),
          waiting: waitlist.length,
          status: getEventStatus(event, activeCount(db, event.id), now),
          myStatus: user ? (findUserSignup(db, event.id, user.id)?.status as
            | "active"
            | "waitlist"
            | null) ?? null : null,
        };
      });
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/70">
        <Image
          src="/hero.webp"
          alt="Волейбольный мяч над площадкой в спортивном зале"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-start gap-5 px-4 py-16 sm:py-24">
          <span className="rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
            Волейбол · компания выпускников
          </span>
          <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            СЕТ — записывайтесь на тренировку в пару кликов
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Ближайшие игры компании в одном месте: состав, очередь резерва и
            честные правила выписки. Места распределяются автоматически —
            никто ничего не договорит вручную.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#events">Ближайшие тренировки</a>
            </Button>
            {!user && (
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Войти</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Список тренировок */}
      <section id="events" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ближайшие тренировки</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Не отменённые и не завершившиеся — по времени начала
            </p>
          </div>
          {user?.isAdmin && (
            <Button asChild>
              <Link href="/events/new">
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Создать тренировку
              </Link>
            </Button>
          )}
        </div>

        {cards.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center">
            <p className="font-medium">Пока нет запланированных тренировок</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {user?.isAdmin
                ? "Создайте первую тренировку кнопкой выше."
                : "Загляните позже — админ обязательно что-нибудь запланирует."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((data) => (
              <EventCard key={data.event.id} data={data} />
            ))}
          </div>
        )}
      </section>

      {/* Правила */}
      <section id="rules" className="border-t border-border/70 bg-card/40">
        <div className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Правила записи и выписки
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Коротко о том, как распределяются места и что происходит при отмене
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RULES.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-3 font-semibold leading-snug">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
