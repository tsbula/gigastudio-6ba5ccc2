import { Phone, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/app/profile/_components/profile-form";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { formatPhone, initials } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Профиль",
  description: "Личные данные участника: имя, фамилия, номер выпуска.",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Профиль</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Данные показываются в списках участников всех тренировок.
      </p>

      <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-4 border-b pb-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {initials(user)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {formatPhone(user.phone)}
              </span>
              {user.isAdmin && (
                <Badge className="gap-1 bg-primary/10 text-primary">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Админ
                </Badge>
              )}
              {user.graduationYear === null && <Badge variant="secondary">легионер</Badge>}
            </p>
          </div>
        </div>

        <div className="pt-6">
          <ProfileForm
            defaults={{
              firstName: user.firstName,
              lastName: user.lastName,
              graduationYear: user.graduationYear ? String(user.graduationYear) : "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
