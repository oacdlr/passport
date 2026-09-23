import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-terracota text-white border border-terracota-oscuro/40 shadow-sm hover:bg-terracota-oscuro",
  secondary: "bg-white text-tinta border border-borde hover:bg-crema",
  ghost: "bg-transparent text-tinta hover:bg-black/5 border border-transparent",
  dark: "bg-bosque text-white border border-bosque hover:bg-bosque-claro",
  danger: "bg-white text-terracota border border-terracota/40 hover:bg-terracota/10",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
} as const;

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
