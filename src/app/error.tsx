"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Что-то пошло не так</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Произошла непредвиденная ошибка. Попробуйте повторить действие — если
          не поможет, вернитесь на главную.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Попробовать снова</Button>
        <Button variant="outline" asChild>
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
}
