import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  PieChart,
  Settings,
  Target,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Falso = rota existe apenas como navegação futura ("Em construção"). */
  ready: boolean;
};

export const primaryNav: NavItem[] = [
  { label: "Visão geral", to: "/dashboard", icon: LayoutDashboard, ready: true },
  { label: "Transações", to: "/transacoes", icon: ArrowLeftRight, ready: true },
  { label: "Contas", to: "/contas", icon: Wallet, ready: true },
  { label: "Cartões", to: "/cartoes", icon: CreditCard, ready: true },
  { label: "Orçamentos", to: "/orcamentos", icon: PiggyBank, ready: false },
  { label: "Metas", to: "/metas", icon: Target, ready: false },
  { label: "Calendário", to: "/calendario", icon: CalendarDays, ready: false },
  { label: "Relatórios", to: "/relatorios", icon: PieChart, ready: false },
  { label: "Configurações", to: "/configuracoes", icon: Settings, ready: true },
];
