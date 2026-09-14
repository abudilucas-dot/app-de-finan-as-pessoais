import {
  Banknote,
  Landmark,
  PiggyBank,
  Smartphone,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash",
  "digital_wallet",
  "investment",
  "other",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Dinheiro",
  digital_wallet: "Carteira digital",
  investment: "Investimentos",
  other: "Outra",
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  checking: Landmark,
  savings: PiggyBank,
  cash: Banknote,
  digital_wallet: Smartphone,
  investment: TrendingUp,
  other: Wallet,
};

export const ACCOUNT_COLORS = [
  "#0F766E",
  "#16A34A",
  "#2563EB",
  "#7C3AED",
  "#D97706",
  "#DC2626",
  "#0EA5E9",
  "#475569",
] as const;

export function accountTypeLabel(type: string) {
  return ACCOUNT_TYPE_LABELS[type as AccountType] ?? "Outra";
}

export function accountTypeIcon(type: string): LucideIcon {
  return ACCOUNT_TYPE_ICONS[type as AccountType] ?? Wallet;
}
