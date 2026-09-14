export type FinancialGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  color: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

export type GoalSummary = Omit<FinancialGoal, "updated_at"> & {
  current_amount: number;
  contribution_count: number;
};

export type GoalInput = {
  name: string;
  target_amount: number;
  target_date?: string | null;
  color?: string | null;
};

export type GoalContribution = {
  id: string;
  user_id: string;
  goal_id: string;
  account_id: string | null;
  amount: number;
  contribution_date: string;
  notes: string | null;
  created_at: string;
};

export type GoalContributionInput = {
  goal_id: string;
  account_id?: string | null;
  amount: number;
  contribution_date: string;
  notes?: string | null;
};

export function goalProgress(currentAmount: number, targetAmount: number) {
  if (!targetAmount) return 0;
  return Math.max(0, (currentAmount / targetAmount) * 100);
}

export function remainingGoalAmount(currentAmount: number, targetAmount: number) {
  return Math.max(targetAmount - currentAmount, 0);
}

export function formatGoalDate(date: string | null) {
  if (!date) return "Sem prazo definido";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function todayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
