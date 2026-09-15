import { Link, createFileRoute } from "@tanstack/react-router";
import { CreditCard, Download, Landmark, Repeat2, Settings, Target, Trash2, Wallet } from "lucide-react";

import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_app/mais")({
  component: MorePage,
});

const links = [
  { to: "/contas", label: "Contas", description: "Gerencie bancos e carteiras", icon: Wallet },
  { to: "/cartoes", label: "Cartões", description: "Controle limites, faturas e parcelas", icon: CreditCard },
  { to: "/metas", label: "Metas", description: "Acompanhe objetivos e aportes", icon: Target },
  { to: "/dividas", label: "Dívidas", description: "Controle o que falta quitar", icon: Landmark },
  { to: "/assinaturas", label: "Assinaturas", description: "Acompanhe serviços recorrentes", icon: Repeat2 },
  { to: "/lixeira", label: "Lixeira", description: "Restaure movimentações excluídas", icon: Trash2 },
  { to: "/configuracoes", label: "Exportar dados", description: "Baixe uma cópia dos seus dados em CSV", icon: Download },
  {
    to: "/configuracoes",
    label: "Configurações",
    description: "Perfil, tema e privacidade",
    icon: Settings,
  },
] as const;

function MorePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Mais" description="Acesse outras áreas do aplicativo." />
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="surface flex min-h-20 items-center gap-4 p-4 transition-colors hover:bg-accent/50"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
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
