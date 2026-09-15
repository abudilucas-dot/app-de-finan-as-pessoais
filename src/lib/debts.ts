export type Debt = {
  id: string;
  user_id: string;
  name: string;
  institution: string | null;
  initial_amount: number;
  remaining_amount: number;
  interest_rate: number | null;
  installment_amount: number | null;
  total_installments: number | null;
  due_day: number | null;
  next_due_date: string | null;
  notes: string | null;
  color: string | null;
  status: "active" | "paid" | "archived";
  created_at: string;
  updated_at: string;
};

export type DebtSummary = Debt & {
  payment_count: number;
  paid_amount: number;
};

export type DebtInput = {
  name: string;
  institution?: string | null;
  initial_amount: number;
  remaining_amount: number;
  interest_rate?: number | null;
  installment_amount?: number | null;
  total_installments?: number | null;
  due_day?: number | null;
  next_due_date?: string | null;
  notes?: string | null;
};

export type DebtPayment = {
  id: string;
  user_id: string;
  debt_id: string;
  transaction_id: string;
  account_id: string | null;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
};

export function debtProgress(debt: Pick<Debt, "initial_amount" | "remaining_amount">) {
  if (!debt.initial_amount) return 0;
  return Math.max(0, Math.min(100, ((debt.initial_amount - debt.remaining_amount) / debt.initial_amount) * 100));
}

export function formatDebtDate(date: string | null) {
  if (!date) return "Sem próximo vencimento";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}
