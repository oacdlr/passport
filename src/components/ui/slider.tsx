"use client";

import * as RadixSlider from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

/**
 * Slider 1–5. La misma escala que los puntos de la tarjeta de Biblioteca,
 * para que una cata se pueda comparar contra la ficha del café.
 */
export function Slider({
  name,
  value,
  onValueChange,
  min = 1,
  max = 5,
  className,
  "aria-label": ariaLabel,
}: {
  name?: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <RadixSlider.Root
      className={cn("relative flex h-6 w-full touch-none items-center select-none", className)}
      value={[value]}
      min={min}
      max={max}
      step={1}
      name={name}
      aria-label={ariaLabel}
      onValueChange={([next]) => onValueChange(next)}
    >
      <RadixSlider.Track className="relative h-1.5 w-full grow rounded-full bg-[#efefef]">
        <RadixSlider.Range className="absolute h-full rounded-full bg-bosque" />
      </RadixSlider.Track>
      <RadixSlider.Thumb className="block size-4 rounded-full bg-bosque shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque" />
    </RadixSlider.Root>
  );
}
