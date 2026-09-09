"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useActionState } from "react";
import { toast } from "sonner";

import { updateProfile } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  defaults,
}: {
  defaults: { firstName: string; lastName: string; graduationYear: string };
}) {
  const [state, formAction, pending] = useActionState(updateProfile, {});

  useEffect(() => {
    if (state.ok) toast.success("Профиль обновлён — изменения видны во всех списках");
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Имя</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={defaults.firstName}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Фамилия</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={defaults.lastName}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="graduationYear">
          Номер выпуска <span className="text-muted-foreground">(необязательно)</span>
        </Label>
        <Input
          id="graduationYear"
          name="graduationYear"
          inputMode="numeric"
          placeholder="2015"
          defaultValue={defaults.graduationYear}
        />
        <p className="text-xs text-muted-foreground">
          Без номера выпуска в списках участников вы будете с бейджем «легионер».
        </p>
      </div>
      {state.error && (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
        Сохранить
      </Button>
    </form>
  );
}
