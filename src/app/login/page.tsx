import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/_components/login-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход",
  description:
    "Вход по номеру телефона: 6-значный код подтверждения и регистрация новых участников.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-5xl justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">Вход в СЕТ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Введите номер телефона — мы «отправим» код подтверждения. Первый
          зарегистрированный становится админом.
        </p>
        <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
