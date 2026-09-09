import { UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SignupRow = {
  userId: string;
  name: string;
  isLegionnaire: boolean;
  isYou: boolean;
};

function Row({
  row,
  index,
  numbered,
}: {
  row: SignupRow;
  index: number;
  numbered: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5",
        row.isYou && "bg-primary/10 ring-1 ring-inset ring-primary/30"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          numbered
            ? "bg-accent/20 text-accent-foreground"
            : "bg-primary/15 text-primary"
        )}
      >
        {numbered ? index : row.name.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {row.name}
          {row.isYou && (
            <span className="ml-1.5 text-xs font-semibold text-primary">(вы)</span>
          )}
        </span>
      </span>
      {row.isLegionnaire && (
        <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide">
          легионер
        </Badge>
      )}
    </li>
  );
}

export function SignupList({
  title,
  counter,
  rows,
  numbered,
  emptyText,
}: {
  title: string;
  counter?: string;
  rows: SignupRow[];
  numbered?: boolean;
  emptyText: string;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {counter && (
          <span className="text-sm text-muted-foreground">{counter}</span>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
          <UserRound className="h-4 w-4" aria-hidden />
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row, i) => (
            <Row key={row.userId} row={row} index={i + 1} numbered={!!numbered} />
          ))}
        </ul>
      )}
    </section>
  );
}
