export const CREDIT_CARD_COLORS = [
  "#0F766E",
  "#2563EB",
  "#7C3AED",
  "#DC2626",
  "#D97706",
  "#475569",
] as const;

export type CreditCard = {
  id: string;
  user_id: string;
  name: string;
  institution: string | null;
  brand: string | null;
  total_limit: number;
  closing_day: number;
  due_day: number;
  default_payment_account_id: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type CreditCardInput = Pick<
  CreditCard,
  | "name"
  | "institution"
  | "brand"
  | "total_limit"
  | "closing_day"
  | "due_day"
  | "default_payment_account_id"
  | "color"
>;

export type CreditCardSummary = {
  credit_card_id: string;
  user_id: string;
  total_limit: number;
  outstanding_balance: number;
  available_limit: number;
};

export type CreditCardInvoice = {
  id: string;
  user_id: string;
  credit_card_id: string;
  cycle_start: string;
  cycle_end: string;
  due_date: string;
  status: "open" | "closed" | "paid" | "overdue";
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export function cardDisplayName(card: Pick<CreditCard, "name" | "institution" | "brand">) {
  return card.institution ?? card.brand ?? card.name;
}

export function formatShortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(year, month - 1, day),
  );
}
