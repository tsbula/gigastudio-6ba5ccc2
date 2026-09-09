"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";

import type { FormResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_DURATION_MIN, MIN_DURATION_MIN } from "@/lib/events";

export type EventFormDefaults = {
  title: string;
  address: string;
  startsAt: string;
  durationMin: string;
  minPlayers: string;
  maxPlayers: string;
  description: string;
};

export const EMPTY_EVENT_DEFAULTS: EventFormDefaults = {
  title: "",
  address: "",
  startsAt: "",
  durationMin: "90",
  minPlayers: "6",
  maxPlayers: "12",
  description: "",
};

export function EventForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  defaults: EventFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Название</Label>
        <Input
          id="title"
          name="title"
          placeholder="Вечерний сет в зале на Школьной"
          defaultValue={defaults.title}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Адрес</Label>
        <Input
          id="address"
          name="address"
          placeholder="Спортзал школы № 302, ул. Школьная, 8"
          defaultValue={defaults.address}
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Дата и время начала</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={defaults.startsAt}
            required
          />
          <p className="text-xs text-muted-foreground">
            Тренировку нельзя запланировать на прошлое.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationMin">Продолжительность, минут</Label>
          <Input
            id="durationMin"
            name="durationMin"
            type="number"
            min={MIN_DURATION_MIN}
            max={MAX_DURATION_MIN}
            step={5}
            defaultValue={defaults.durationMin}
            required
          />
          <p className="text-xs text-muted-foreground">
            От {MIN_DURATION_MIN} до {MAX_DURATION_MIN} минут.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="minPlayers">Минимум участников</Label>
          <Input
            id="minPlayers"
            name="minPlayers"
            type="number"
            min={1}
            max={30}
            defaultValue={defaults.minPlayers}
            required
          />
          <p className="text-xs text-muted-foreground">
            Меньше — и за 4 часа до начала тренировка отменится автоматически.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPlayers">Максимум участников</Label>
          <Input
            id="maxPlayers"
            name="maxPlayers"
            type="number"
            min={2}
            max={40}
            defaultValue={defaults.maxPlayers}
            required
          />
          <p className="text-xs text-muted-foreground">
            Нельзя сделать меньше, чем уже записалось людей.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Описание <span className="text-muted-foreground">(необязательно)</span>
        </Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Формат игры, что взять с собой, где раздеться…"
          defaultValue={defaults.description}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {state.error && (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} size="lg">
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
        {submitLabel}
      </Button>
    </form>
  );
}
