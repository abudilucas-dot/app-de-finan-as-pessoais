import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Plus, Wallet } from "lucide-react";

import { AccountCard } from "@/components/app/AccountCard";
import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { useAccounts } from "@/hooks/useAccounts";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: `Visão geral — ${brand.name}` }],
  }),
  component: DashboardPage,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function DashboardPage() {
  const { data: profile } = useProfile();
  const accounts = useAccounts();

  if (accounts.isLoading) return <LoadingState label="Carregando seu resumo..." />;
  if (accounts.isError) return <ErrorState onRetry={() => accounts.refetch()} />;

  const activeAccounts = (accounts.data ?? []).filter((account) => !account.is_archived);
  const totalBalance = activeAccounts.reduce(
    (total, account) => total + Number(account.initial_balance),
    0,
  );
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""} 👋`}
        description="Veja o ponto de partida da sua organização financeira."
        actions={
          <Button asChild>
            <Link to="/contas">
              <Plus aria-hidden="true" />
              Nova conta
            </Link>
          </Button>
        }
      />

      <section aria-label="Resumo financeiro" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="surface p-5 sm:col-span-2">
          <p className="text-sm font-medium text-muted-foreground">Saldo total inicial</p>
          <MoneyDisplay
            value={totalBalance}
            className="mt-2 block text-3xl font-semibold tracking-tight"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Soma das contas ativas. As movimentações serão incluídas na próxima etapa.
          </p>
        </article>
        <article className="surface p-5">
          <p className="text-sm font-medium text-muted-foreground">Contas ativas</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{activeAccounts.length}</p>
          <p className="mt-2 text-xs text-muted-foreground">Bancos, carteiras e dinheiro.</p>
        </article>
        <article className="surface p-5">
          <p className="text-sm font-medium text-muted-foreground">Etapa atual</p>
          <p className="mt-2 text-lg font-semibold">Fundação concluída</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Seu espaço já está pronto para receber transações.
          </p>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Suas contas</h2>
          {activeAccounts.length ? (
            <Link to="/contas" className="text-sm font-medium text-primary hover:underline">
              Ver todas
            </Link>
          ) : null}
        </div>

        {activeAccounts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeAccounts.slice(0, 3).map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Wallet}
            title="Cadastre sua primeira conta"
            description="Adicione uma conta para começar a visualizar seu saldo inicial."
            action={
              <Button asChild>
                <Link to="/contas">Adicionar conta</Link>
              </Button>
            }
          />
        )}
      </section>

      <section>
        <EmptyState
          icon={ArrowLeftRight}
          title="Seu espaço financeiro está pronto"
          description="Na próxima etapa, você poderá adicionar receitas, despesas e transferências. Nenhum valor fictício é mostrado aqui."
        />
      </section>
    </div>
  );
}
