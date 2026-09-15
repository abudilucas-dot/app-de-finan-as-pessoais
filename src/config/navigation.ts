import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Landmark,
  PieChart,
  Settings,
  Target,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  Repeat2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Indica se a rota já está disponível para uso. */
  ready: boolean;
};

export const primaryNav: NavItem[] = [
  { label: "Visão geral", to: "/dashboard", icon: LayoutDashboard, ready: true },
  { label: "Transações", to: "/transacoes", icon: ArrowLeftRight, ready: true },
  { label: "Contas", to: "/contas", icon: Wallet, ready: true },
  { label: "Cartões", to: "/cartoes", icon: CreditCard, ready: true },
  { label: "Orçamentos", to: "/orcamentos", icon: PiggyBank, ready: true },
  { label: "Metas", to: "/metas", icon: Target, ready: true },
  { label: "Dívidas", to: "/dividas", icon: Landmark, ready: true },
  { label: "Assinaturas", to: "/assinaturas", icon: Repeat2, ready: true },
  { label: "Calendário", to: "/calendario", icon: CalendarDays, ready: true },
  { label: "Relatórios", to: "/relatorios", icon: PieChart, ready: true },
  { label: "Configurações", to: "/configuracoes", icon: Settings, ready: true },
];
