import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const tones = {
  sage: "bg-salvia text-bosque",
  sand: "bg-arena text-[#8a5a2b]",
  green: "bg-bosque text-white",
  plain: "bg-crema text-tinta-suave",
} as const;

type BadgeProps = ComponentProps<"span"> & { tone?: keyof typeof tones };

export function Badge({ className, tone = "plain", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
