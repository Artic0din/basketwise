import { cn } from "@/lib/utils";

type StoreSlug = "woolworths" | "coles" | "aldi" | "iga";

interface StoreChipProps {
  store: StoreSlug;
  size?: "sm" | "lg";
  className?: string;
}

const STORE_DATA: Record<
  StoreSlug,
  { label: string; mark: string; markClass: string }
> = {
  woolworths: {
    label: "Woolworths",
    mark: "W",
    markClass: "bg-[var(--store-woolies)]",
  },
  coles: {
    label: "Coles",
    mark: "C",
    markClass: "bg-[var(--store-coles)]",
  },
  aldi: {
    label: "ALDI",
    mark: "A",
    markClass:
      "bg-gradient-to-br from-[var(--store-aldi-blue)] from-55% via-[var(--store-aldi-yellow)] via-75% to-[var(--store-aldi-red)]",
  },
  iga: {
    label: "IGA",
    mark: "I",
    markClass: "bg-[var(--store-iga)]",
  },
};

export function StoreChip({ store, size = "sm", className }: StoreChipProps) {
  const data = STORE_DATA[store];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-cream-200 bg-white text-ink-900 leading-none",
        size === "sm" && "py-[3px] pl-[3px] pr-2.5 text-xs font-semibold",
        size === "lg" && "py-1.5 pl-1.5 pr-4 text-sm font-semibold",
        className,
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-full text-white font-bold",
          size === "sm" && "h-[22px] w-[22px] text-[11px]",
          size === "lg" && "h-7 w-7 text-[12.5px]",
          data.markClass,
        )}
      >
        {data.mark}
      </span>
      {data.label}
    </span>
  );
}
