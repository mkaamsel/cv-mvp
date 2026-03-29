type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      {eyebrow ? (
        <p className="mb-3 text-sm font-medium text-[var(--color-text-secondary)]">
          {eyebrow}
        </p>
      ) : null}

      <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] md:text-4xl">
        {title}
      </h1>

      {description ? (
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}