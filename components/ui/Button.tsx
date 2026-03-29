type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit" | "reset";
  className?: string;
  onClick?: () => void;
};

export default function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  onClick,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-[var(--radius-md)] px-5 py-3 text-sm font-medium transition-colors";
  const variants = {
    primary:
      "border border-[var(--color-border)] bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:bg-[var(--color-primary-hover)]",
    secondary:
      "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]",
    ghost:
      "border border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-background-soft)]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}