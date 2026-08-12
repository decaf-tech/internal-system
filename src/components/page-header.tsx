export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1.5 text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            {description}
          </p>
        )}
        {/* Garis pendek terracotta — motif pembuka seksi dari proposal. */}
        <div className="mt-3 h-0.5 w-10 bg-accent" />
      </div>
      {/* Tindakan halaman melebar penuh di HP. Tombol selebar 40% layar
          yang menempel di satu sudut lebih sulit dikenai daripada yang
          mengisi barisnya sendiri, dan di sini tidak ada yang
          memperebutkan ruang itu. */}
      {action && (
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">{action}</div>
      )}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="font-medium text-ink">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
