type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
};

export function PageHeader({ title, description, actions, meta }: Props) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6 animate-fade-up">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-[1.75rem] font-medium leading-none tracking-tight">
            {title}
          </h1>
          {meta}
        </div>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
