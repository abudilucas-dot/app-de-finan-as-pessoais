import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CircleHelp,
  CreditCard,
  Download,
  Landmark,
  Repeat2,
  Settings,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/app/PageHeader";
import { moduleThemes } from "@/config/moduleThemes";

export const Route = createFileRoute("/_app/mais")({
  component: MorePage,
});

const links = [
  { to: "/contas", label: "Contas", description: "Gerencie bancos e carteiras", icon: Wallet, theme: moduleThemes.accounts },
  { to: "/cartoes", label: "Cartões", description: "Controle limites, faturas e parcelas", icon: CreditCard, theme: moduleThemes.cards },
  { to: "/metas", label: "Metas", description: "Acompanhe objetivos e aportes", icon: Target, theme: moduleThemes.goals },
  { to: "/dividas", label: "Dívidas", description: "Controle o que falta quitar", icon: Landmark, theme: moduleThemes.debts },
  { to: "/assinaturas", label: "Assinaturas", description: "Acompanhe serviços recorrentes", icon: Repeat2, theme: moduleThemes.subscriptions },
  { to: "/lixeira", label: "Lixeira", description: "Restaure movimentações excluídas", icon: Trash2, theme: moduleThemes.trash },
  { to: "/ajuda", label: "Ajuda e suporte", description: "Tire dúvidas sobre o aplicativo", icon: CircleHelp, theme: moduleThemes.support },
  { to: "/configuracoes", search: { focusExport: true }, label: "Exportar dados", description: "Baixe uma cópia dos seus dados em CSV", icon: Download, theme: moduleThemes.export },
  { to: "/configuracoes", label: "Configurações", description: "Perfil, tema e privacidade", icon: Settings, theme: moduleThemes.settings },
] as const;

function MorePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Mais" description="Acesse outras áreas do aplicativo." />
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            search={"search" in item ? item.search : undefined}
            className={`surface flex min-h-20 items-center gap-4 border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${item.theme.card}`}
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.theme.icon}`}>
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold">{item.label}</span>
              <span className="block text-sm text-muted-foreground">{item.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
