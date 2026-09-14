export const TRANSACTION_TYPES = ["income", "expense", "transfer", "card_payment"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type DirectTransactionType = Exclude<TransactionType, "card_payment">;

export const TRANSACTION_STATUSES = ["confirmed", "pending", "overdue", "cancelled"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
  card_payment: "Pagamento de fatura",
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  confirmed: "Confirmada",
  pending: "Pendente",
  overdue: "Atrasada",
  cancelled: "Cancelada",
};

export type FinancialTransaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  destination_account_id: string | null;
  credit_card_id: string | null;
  invoice_id: string | null;
  transaction_date: string;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionInput = {
  type: DirectTransactionType;
  description: string;
  amount: number;
  category_id: string | null;
  account_id: string;
  destination_account_id: string | null;
  transaction_date: string;
  status: TransactionStatus;
  notes: string | null;
};

export function calculateMonthlySummary(
  transactions: FinancialTransaction[],
  reference = new Date(),
) {
  const year = reference.getFullYear();
  const month = reference.getMonth() + 1;
  let income = 0;
  let expense = 0;

  for (const transaction of transactions) {
    if (transaction.status !== "confirmed" || transaction.type === "transfer") continue;
    const [transactionYear, transactionMonth] = transaction.transaction_date.split("-").map(Number);
    if (transactionYear !== year || transactionMonth !== month) continue;
    if (transaction.type === "income") income += Number(transaction.amount);
    if (transaction.type === "expense") expense += Number(transaction.amount);
  }

  const result = income - expense;
  return {
    income,
    expense,
    result,
    savingsRate: income > 0 ? (result / income) * 100 : null,
  };
}

export function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTransactionDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(year, month - 1, day),
  );
}
