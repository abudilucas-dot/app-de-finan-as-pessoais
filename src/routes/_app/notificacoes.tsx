import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Target,
  Trash2,
  WalletCards,
} from "lucide-react";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import type { AppNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notificacoes")({
  component: NotificationsPage,
});

const notificationIcon = {
  scheduled: CalendarClock,
  invoice: CreditCard,
  budget: WalletCards,
  goal: Target,
  debt: Landmark,
} as const;

function NotificationsPage() {
  const { notifications, isLoading, isError, refetch, dismiss, dismissAll } = useNotifications();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificações"
        description="Acompanhe os pontos que precisam da sua atenção."
        actions={
          notifications.length > 0 ? (
            <Button
              variant="outline"
              onClick={() => dismissAll.mutate(notifications.map((notification) => notification.key))}
              disabled={dismissAll.isPending}
            >
              <Trash2 aria-hidden="true" />
              Dispensar todas
            </Button>
          ) : null
        }
      />

      {isLoading ? <LoadingState label="Verificando seus avisos..." /> : null}

      {!isLoading && isError ? (
        <ErrorState
          title="Não foi possível carregar as notificações"
          description="Tente novamente em alguns instantes."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && notifications.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="Tudo em dia por aqui"
          description="Quando houver uma fatura ou dívida próxima, lançamento pendente, orçamento no limite ou meta concluída, o aviso aparecerá aqui."
        />
      ) : null}

      {!isLoading && !isError && notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.key}
              notification={notification}
              onDismiss={() => dismiss.mutate(notification.key)}
              isDismissing={dismiss.isPending && dismiss.variables === notification.key}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NotificationCard({
  notification,
  onDismiss,
  isDismissing,
}: {
  notification: AppNotification;
  onDismiss: () => void;
  isDismissing: boolean;
}) {
  const Icon = notificationIcon[notification.kind];
  const urgent = notification.priority === "critical";
  const success = notification.priority === "success";

  return (
    <article
      className={cn(
        "surface flex gap-4 p-4 sm:p-5",
        urgent && "border-destructive/40",
        success && "border-primary/35",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          urgent && "bg-destructive/10 text-destructive",
          !urgent && !success && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
          success && "bg-primary/10 text-primary",
        )}
      >
        {success ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
      </span>

      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{notification.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{notification.description}</p>
        <Link
          to={notification.to}
          className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Ver detalhes
        </Link>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={onDismiss}
        disabled={isDismissing}
        aria-label={`Dispensar notificação: ${notification.title}`}
      >
        {isDismissing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </article>
  );
}
