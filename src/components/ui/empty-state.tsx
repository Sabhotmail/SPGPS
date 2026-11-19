import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-center px-5 py-12",
        className
      )}
    >
      <p className="text-[13px] font-medium tracking-tight text-foreground">
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
