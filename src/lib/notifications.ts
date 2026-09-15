export type AppNotificationDestination =
  | "/calendario"
  | "/cartoes"
  | "/metas"
  | "/orcamentos"
  | "/dividas"
  | "/assinaturas";

export type AppNotificationKind = "scheduled" | "invoice" | "budget" | "goal" | "debt" | "subscription";
export type AppNotificationPriority = "warning" | "critical" | "success";

export type AppNotification = {
  key: string;
  kind: AppNotificationKind;
  priority: AppNotificationPriority;
  title: string;
  description: string;
  to: AppNotificationDestination;
};

export type NotificationDismissal = {
  id: string;
  user_id: string;
  notification_key: string;
  dismissed_at: string;
};

export function dateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
