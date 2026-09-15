export type RecurringFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "annual";

export type RecurringRule = {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  account_id: string;
  frequency: RecurringFrequency;
  next_occurrence: string;
  end_date: string | null;
  notes: string | null;
  active: boolean;
  is_subscription: boolean;
  created_at: string;
  updated_at: string;
};

export type RecurringRuleInput = Pick<
  RecurringRule,
  "description" | "amount" | "type" | "category_id" | "account_id" | "frequency" | "next_occurrence" | "end_date" | "notes" | "is_subscription"
>;

export const recurringFrequencyLabels: Record<RecurringFrequency, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

export function todayDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function formatScheduledDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function getScheduledDateLabel(date: string) {
  const today = todayDate();
  if (date < today) return "Em atraso";
  if (date === today) return "Hoje";
  return formatScheduledDate(date);
}

export function monthlyEquivalent(amount: number, frequency: RecurringFrequency) {
  const multipliers: Record<RecurringFrequency, number> = {
    weekly: 52 / 12,
    biweekly: 26 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    semiannual: 1 / 6,
    annual: 1 / 12,
  };
  return Number(amount) * multipliers[frequency];
}
