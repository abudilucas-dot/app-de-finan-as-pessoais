import { createFileRoute } from "@tanstack/react-router";
import { Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AccountCard } from "@/components/app/AccountCard";
import { AccountFormDialog } from "@/components/app/AccountFormDialog";
import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { moduleThemes } from "@/config/moduleThemes";
import { toBalanceMap, useAccountBalances } from "@/hooks/useAccountBalances";
import { type Account, useAccounts, useUpdateAccount } from "@/hooks/useAccounts";

export const Route = createFileRoute("/_app/contas")({
  head: () => ({ meta: [{ title: `Contas — ${brand.name}` }] }),
  component: AccountsPage,
});

function AccountsPage() {
  const accounts = useAccounts();
  const balances = useAccountBalances();
  const updateAccount = useUpdateAccount();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Account | null>(null);

  if (accounts.isLoading || balances.isLoading) {
    return <LoadingState label="Carregando suas contas..." />;
  }
  if (accounts.isError || balances.isError) {
    return (
      <ErrorState
        onRetry={() => {
          accounts.refetch();
          balances.refetch();
        }}
      />
    );
  }

  const allAccounts = accounts.data ?? [];
  const activeAccounts = allAccounts.filter((account) => !account.is_archived);
  const archivedAccounts = allAccounts.filter((account) => account.is_archived);
  const balanceMap = toBalanceMap(balances.data);
  const activeTotal = activeAccounts.reduce(
    (total, account) => total + (balanceMap.get(account.id) ?? Number(account.initial_balance)),
    0,
  );

  const theme = moduleThemes.accounts;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setFormOpen(true);
  };

  const toggleArchive = async (account: Account) => {
    try {
      await updateAccount.mutateAsync({ id: account.id, is_archived: !account.is_archived });
      toast.success(account.is_archived ? "Conta reativada." : "Conta arquivada.");
    } catch {
      toast.error("Não foi possível alterar o status da conta.");
    } finally {
      setArchiveTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contas"
        description="Gerencie onde seu dinheiro está guardado."
        actions={
          <Button className={theme.primary} onClick={openCreate}>
            <Plus aria-hidden="true" />
            Nova conta
          </Button>
        }
      />

      <section className={`surface flex flex-col gap-2 border p-5 sm:flex-row sm:items-center sm:justify-between ${theme.card}`}>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Saldo total atual</p>
          <MoneyDisplay value={activeTotal} className={`mt-1 block text-2xl font-semibold ${theme.text}`} />
        </div>
        <p className="text-sm text-muted-foreground">
          {activeAccounts.length} {activeAccounts.length === 1 ? "conta ativa" : "contas ativas"}
        </p>
      </section>

      {activeAccounts.length ? (
        <section className="space-y-4">
          <h2 className={`text-lg font-semibold ${theme.text}`}>Contas ativas</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                currentBalance={balanceMap.get(account.id) ?? Number(account.initial_balance)}
                onEdit={openEdit}
                onArchive={setArchiveTarget}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta ativa"
          description="Cadastre uma conta bancária, carteira digital ou dinheiro em espécie."
          action={<Button className={theme.primary} onClick={openCreate}>Adicionar conta</Button>}
        />
      )}

      {archivedAccounts.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Arquivadas</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archivedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                currentBalance={balanceMap.get(account.id) ?? Number(account.initial_balance)}
                onArchive={toggleArchive}
              />
            ))}
          </div>
        </section>
      ) : null}

      <AccountFormDialog open={formOpen} onOpenChange={setFormOpen} account={editing} />

      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar esta conta?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta deixa de aparecer no saldo total, mas continua salva e pode ser reativada
              depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateAccount.isPending}
              onClick={() => archiveTarget && toggleArchive(archiveTarget)}
            >
              {updateAccount.isPending ? "Arquivando..." : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
