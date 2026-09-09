"use client";

import { ArrowLeft, Loader2, Lock, Phone, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  completeRegistration,
  demoLogin,
  requestLoginCode,
  verifyLoginCode,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhone } from "@/lib/events";

type Step = "phone" | "code" | "register";

const SERVER_UNAVAILABLE =
  "Не удалось связаться с сервером. Попробуйте ещё раз через минуту.";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [regToken, setRegToken] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [demoPending, startDemo] = useTransition();

  const submitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      let res;
      try {
        res = await requestLoginCode(phone);
      } catch {
        setError(SERVER_UNAVAILABLE);
        return;
      }
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShownCode(res.code ?? null);
      setStep("code");
    });
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      let res;
      try {
        res = await verifyLoginCode(phone, code);
      } catch {
        setError(SERVER_UNAVAILABLE);
        return;
      }
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.registered) {
        router.push("/");
        router.refresh();
        return;
      }
      setRegToken(res.regToken ?? "");
      setStep("register");
    });
  };

  const submitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      let res;
      try {
        res = await completeRegistration(
          regToken,
          firstName,
          lastName,
          graduationYear
        );
      } catch {
        setError(SERVER_UNAVAILABLE);
        return;
      }
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  const demo = (role: "admin" | "member") => {
    setError(null);
    startDemo(async () => {
      try {
        await demoLogin(role);
      } catch {
        // redirect() внутри действия обрабатывается Next.js и клиентский промис
        // не отклоняет; сюда попадает только реальный сбой действия
        setError(SERVER_UNAVAILABLE);
      }
    });
  };

  return (
    <div className="w-full max-w-md">
      {step === "phone" && (
        <form onSubmit={submitPhone} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Номер телефона</Label>
            <div className="relative">
              <Phone
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (900) 123-45-67"
                className="pl-9"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Получить код
          </Button>

          <div className="relative py-2 text-center">
            <span className="relative z-10 bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">
              или быстрый демо-вход
            </span>
            <span className="absolute left-0 top-1/2 z-0 h-px w-full bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={demoPending}
              onClick={() => demo("admin")}
            >
              {demoPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Войти как админ
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={demoPending}
              onClick={() => demo("member")}
            >
              Войти как участник
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Демо-вход открывает готовые данные: 10 игроков и 2 тренировки
            с полным составом и очередью резерва.
          </p>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={submitCode} className="space-y-4">
          <div className="rounded-lg border border-accent/50 bg-accent/10 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-accent-foreground">
              Демо-режим: СМС-шлюз не подключён
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-[0.4em] text-foreground">
              {shownCode}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Код живёт 10 минут, на ввод — 5 попыток
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Код из «СМС»</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              className="text-center font-mono text-lg tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            <Lock className="mr-2 h-4 w-4" aria-hidden />
            Подтвердить
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Изменить номер
          </Button>
        </form>
      )}

      {step === "register" && (
        <form onSubmit={submitRegistration} className="space-y-4">
          <div>
            <p className="font-semibold">Регистрация</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Номер {formatPhone(phone.replace(/\D/g, ""))} подтверждён.
              Расскажите о себе — имя попадёт в списки участников.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">Имя</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Александр"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Фамилия</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Перов"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="graduationYear">
              Номер выпуска <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Input
              id="graduationYear"
              inputMode="numeric"
              placeholder="2015"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value.replace(/\D/g, ""))}
            />
            <p className="text-xs text-muted-foreground">
              Без номера выпуска вы будете отмечены бейджем «легионер».
            </p>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <UserRoundPlus className="mr-2 h-4 w-4" aria-hidden />
            )}
            Завершить регистрацию
          </Button>
        </form>
      )}
    </div>
  );
}
