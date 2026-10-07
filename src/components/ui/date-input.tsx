import * as React from "react";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

type DateInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  emptyLabel?: string;
};

function formatDate(value: DateInputProps["value"] | DateInputProps["defaultValue"]): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

/** Campo visual que abre o seletor de data nativo sem permitir overflow no iPhone. */
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, defaultValue, emptyLabel = "Selecionar data", disabled, ...props }, ref) => {
    const displayValue = formatDate(value ?? defaultValue);

    return (
      <div
        className={cn(
          "relative min-w-0 max-w-full overflow-hidden rounded-md border border-input bg-transparent shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <div className="flex h-9 min-w-0 items-center justify-between gap-3 px-3 text-base md:text-sm" aria-hidden="true">
          <span className={cn("min-w-0 truncate", !displayValue && "text-muted-foreground")}>
            {displayValue ?? emptyLabel}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <input
          ref={ref}
          type="date"
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          className="absolute inset-0 z-10 m-0 h-full w-full max-w-none cursor-pointer appearance-none border-0 bg-transparent p-0 opacity-0 outline-none [-webkit-appearance:none]"
          {...props}
        />
      </div>
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
