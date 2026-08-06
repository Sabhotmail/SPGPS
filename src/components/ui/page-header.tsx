type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
};

export function PageHeader({ title, description, actions, meta }: Props) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/80 pb-6 animate-fade-up">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="relative text-xl font-semibold tracking-tight">
            <span className="absolute -left-3 top-1.5 hidden h-5 w-0.5 rounded-full bg-primary sm:block" />
            {title}
          </h1>
          {meta}
        </div>
        {description && (
          <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
