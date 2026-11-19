type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  eyebrow?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  meta,
  eyebrow = "Admin",
}: Props) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border/60 pb-6 animate-fade-up sm:mb-8 sm:pb-7 md:flex-row md:flex-wrap md:items-end md:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
        <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
          <h1 className="font-brand text-[1.5rem] font-semibold leading-none tracking-tight sm:text-[1.85rem]">
            {title}
          </h1>
          {meta}
        </div>
        {description && (
          <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:shrink-0 md:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
