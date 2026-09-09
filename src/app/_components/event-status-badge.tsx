import { cn } from "@/lib/utils";
import type { EventStatus } from "@/lib/events";

const STYLES: Record<EventStatus["key"], string> = {
  open: "border-success/30 bg-success/10 text-success",
  reserve: "border-accent/50 bg-accent/15 text-accent-foreground",
  ongoing: "border-primary/30 bg-primary/10 text-primary",
  finished: "border-border bg-muted text-muted-foreground",
  cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STYLES[status.key],
        className
      )}
    >
      {status.key === "ongoing" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
      )}
      {status.label}
    </span>
  );
}
