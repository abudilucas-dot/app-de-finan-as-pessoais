import { useSettings } from "@/hooks/useSettings";
import { MASKED_MONEY, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type MoneyDisplayProps = {
  value: number | string | null | undefined;
  className?: string;
  /** Dá cor de acordo com o sinal do valor. */
  signed?: boolean;
};

export function MoneyDisplay({ value, className, signed = false }: MoneyDisplayProps) {
  const { data: settings } = useSettings();
  const hidden = settings?.hide_values ?? false;
  const numeric = typeof value === "string" ? Number(value) : (value ?? 0);

  return (
    <span
      className={cn(
        "tabular-nums",
        signed && !hidden && numeric > 0 && "text-positive",
        signed && !hidden && numeric < 0 && "text-negative",
        className,
      )}
    >
      {hidden ? MASKED_MONEY : formatMoney(numeric, settings?.currency ?? "BRL")}
    </span>
  );
}
