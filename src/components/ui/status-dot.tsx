import { cn } from "@/lib/utils";

type Status = "online" | "idle" | "offline";

const colors: Record<Status, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  offline: "bg-status-offline",
};

const labels: Record<Status, string> = {
  online: "ออนไลน์",
  idle: "ไม่เคลื่อนไหว",
  offline: "ออฟไลน์",
};

export function StatusDot({
  status,
  showLabel = false,
  className,
}: {
  status: Status;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", colors[status])}
        aria-hidden
      />
      {showLabel && (
        <span className="text-[12px] text-muted-foreground">{labels[status]}</span>
      )}
    </span>
  );
}
