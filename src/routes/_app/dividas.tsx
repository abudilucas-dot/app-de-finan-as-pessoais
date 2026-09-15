import { createFileRoute } from "@tanstack/react-router";
import { Landmark, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DebtCard } from "@/components/app/DebtCard";
import { DebtFormDialog } from "@/components/app/DebtFormDialog";
import { DebtPaymentDialog } from "@/components/app/DebtPaymentDialog";
import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { useAccounts } from "@/hooks/useAccounts";
import { useArchiveDebt, useDebtSummaries } from "@/hooks/useDebts";
import type { DebtSummary } from "@/lib/debts";

export const Route = createFileRoute("/_app/dividas")({
  head: () => ({ meta: [{ title: "Dívidas — " + brand.name }] }),
  component: DebtsPage,
});

function DebtsPage() {
  const debts = useDebtSummaries();
  const accounts = useAccounts();
  const archiveDebt = useArchiveDebt();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtSummary | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<DebtSummary | null>(null);

  const accountNames = useMemo(
    () => new Map((accounts.data ?? []).map((account) => [account.id, account.name])),
    [accounts.data],
  );

  if (debts.isLoading || accounts.isLoading) return <LoadingState label="Carregando suas dívidas..." />;
  if (debts.isError || accounts.isError) return <ErrorState onRetry={() => { debts.refetch(); accounts.refetch(); }} />;

  const items = debts.data ?? [];
  const openDebts = items.filter((debt) => debt.status === "active");
  const totalRemaining = openDebts.reduce((sum, debt) => sum + Number(debt.remaining_amount), 0);
  const totalInitial = items.reduce((sum, debt) => sum + Number(debt.initial_amount), 0);

  const archive = async (debt: DebtSummary) => {
    if (!window.confirm("Arquivar “" + debt.name + "”? Os pagamentos e lançamentos serão mantidos no histórico.")) return;
    try {
      await archiveDebt.mutateAsync(debt.id);
      toast.success("Dívida arquivada.");
    } catch {
      toast.error("Não foi possível arquivar a dívida.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dívidas"
        description="Acompanhe empréstimos, financiamentos e valores que ainda faltam quitar."
        actions={<Button onClick={() => { setEditingDebt(null); setFormOpen(true); }}><Plus aria-hidden="true" />Nova dívida</Button>}
      />

      {items.length ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <article className="surface p-5"><p className="text-sm text-muted-foreground">Total em aberto</p><MoneyDisplay value={totalRemaining} className="mt-2 block text-2xl font-semibold text-negative" /></article>
            <article className="surface p-5"><p className="text-sm text-muted-foreground">Valor inicial cadastrado</p><MoneyDisplay value={totalInitial} className="mt-2 block text-2xl font-semibold" /></article>
          </section>
          <section className="grid gap-4 xl:grid-cols-2">
            {items.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                accountNames={accountNames}
                onEdit={(selected) => { setEditingDebt(selected); setFormOpen(true); }}
                onPay={setPaymentDebt}
                onArchive={archive}
              />
            ))}
          </section>
        </>
      ) : (
        <EmptyState icon={Landmark} title="Nenhuma dívida cadastrada" description="Cadastre uma dívida para visualizar o que falta quitar e registrar pagamentos." action={<Button onClick={() => setFormOpen(true)}>Cadastrar primeira dívida</Button>} />
      )}

      <DebtFormDialog open={formOpen} onOpenChange={setFormOpen} debt={editingDebt} />
      <DebtPaymentDialog open={Boolean(paymentDebt)} onOpenChange={(open) => { if (!open) setPaymentDebt(null); }} debt={paymentDebt} accounts={accounts.data ?? []} />
    </div>
  );
}
