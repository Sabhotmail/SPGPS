export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-start justify-center px-5 py-12">
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
