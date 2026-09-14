import { AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadingState({ label = "Carregando...", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground", className)}
    >
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "Algo deu errado",
  description = "Não foi possível carregar estas informações. Tente novamente.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("surface flex flex-col items-center gap-3 px-6 py-12 text-center", className)}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface flex flex-col items-center gap-4 px-6 py-14 text-center", className)}>
      {Icon ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      ) : null}
      <div className="max-w-md space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
