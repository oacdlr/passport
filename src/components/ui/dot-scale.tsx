import { cn } from "@/lib/utils";

/**
 * Escala 1–5 en puntos, como en las tarjetas de Biblioteca.
 * Es la misma escala que el slider de Degustación: ver 0002_library.sql.
 */
export function DotScale({
  value,
  label,
  max = 5,
  className,
}: {
  value: number | null;
  label?: string;
  max?: number;
  className?: string;
}) {
  const filled = value ?? 0;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {label && <span className="text-sm text-tinta-suave">{label}</span>}
      <span className="inline-flex items-center gap-1" role="img" aria-label={`${label ?? ""} ${filled} / ${max}`}>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={cn(
              "size-[7px] rounded-full",
              i < filled ? "bg-tinta-suave" : "border border-tinta-suave/45",
            )}
          />
        ))}
      </span>
    </span>
  );
}
