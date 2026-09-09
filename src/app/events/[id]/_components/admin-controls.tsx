"use client";

import { Ban, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { cancelEvent } from "@/app/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function AdminControls({
  eventId,
  cancellable,
}: {
  eventId: string;
  cancellable: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/events/${eventId}/edit`}>
          <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
          Редактировать
        </Link>
      </Button>
      {cancellable && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive">
              <Ban className="mr-1.5 h-4 w-4" aria-hidden />
              Отменить тренировку
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Отменить тренировку?</AlertDialogTitle>
              <AlertDialogDescription>
                Тренировка будет помечена «Отменена организатором», исчезнет из
                общего списка, но останется доступной по прямой ссылке. Действие
                необратимо.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Вернуться</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                onClick={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    const res = await cancelEvent(eventId);
                    if (!res.ok && res.error) toast.error(res.error);
                  });
                }}
              >
                {pending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                )}
                Отменить тренировку
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
