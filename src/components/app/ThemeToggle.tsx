import { Laptop, Moon, Sun } from "lucide-react";

import { useTheme, type Theme } from "@/components/theme-provider";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Laptop },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const handleSelect = (next: Theme) => {
    setTheme(next);
    if (settings) updateSettings.mutate({ theme: next });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className={cn("inline-flex items-center gap-1 rounded-full border bg-muted/60 p-1", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          onClick={() => handleSelect(value)}
          className={cn(
            "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
            theme === value
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
