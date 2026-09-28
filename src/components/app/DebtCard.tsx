import { CalendarDays, Pencil, Plus, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDebtPayments, useDeleteDebtPayment } from "@/hooks/useDebts";
import { debtProgress, formatDebtDate, type DebtSummary } from "@/lib/debts";

export function DebtCard({
  debt,
  accountNames,
  onEdit,
  onPay,
  onArchive,
}: {
  debt: DebtSummary;
  accountNames: Map<string, string>;
  onEdit: (debt: DebtSummary) => void;
  onPay: (debt: DebtSummary) => void;
  onArchive: (debt: DebtSummary) => void;
}) {
  const payments = useDebtPayments(debt.id);
  const deletePayment = useDeleteDebtPayment();
  const remaining = Number(debt.remaining_amount);
  const initial = Number(debt.initial_amount);
  const progress = debtProgress({ initial_amount: initial, remaining_amount: remaining });
  const isPaid = debt.status === "paid";

  const removePayment = async (id: string, isHistorical: boolean) => {
    if (!window.confirm(isHistorical ? "Remover este pagamento histórico da dívida?" : "Remover este pagamento? O lançamento de despesa correspondente também será enviado para a lixeira.")) return;
    try {
      await deletePayment.mutateAsync(id);
      toast.success(isHistorical ? "Pagamento histórico removido." : "Pagamento removido e lançamento enviado para a lixeira.");
    } catch {
      toast.error("Não foi possível remover o pagamento.");
    }
  };

  return (
    <article className="surface overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <WalletCards className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{debt.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{debt.institution || "Sem instituição informada"}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label="Editar dívida" onClick={() => onEdit(debt)}><Pencil /></Button>
          <Button variant="ghost" size="icon" aria-label="Arquivar dívida" onClick={() => onArchive(debt)}><Trash2 /></Button>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Falta pagar</p>
          <MoneyDisplay value={remaining} className={isPaid ? "mt-1 block text-2xl font-semibold text-positive" : "mt-1 block text-2xl font-semibold"} />
        </div>
        <span className={isPaid ? "text-sm font-medium text-positive" : "text-sm text-muted-foreground"}>
          {isPaid ? "Quitada 🎉" : progress.toFixed(0) + "% pago"}
        </span>
      </div>
      <Progress value={progress} className="mt-3" indicatorClassName={isPaid ? "bg-positive" : undefined} />
      <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <p>Original: <MoneyDisplay value={initial} /></p>
        <p className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDebtDate(debt.next_due_date)}</p>
        {debt.installment_amount ? <p>Parcela: <MoneyDisplay value={debt.installment_amount} /></p> : null}
        {debt.total_installments ? <p>{debt.total_installments} parcelas previstas</p> : null}
      </div>

      {!isPaid ? <Button className="mt-5 w-full" variant="outline" onClick={() => onPay(debt)}><Plus aria-hidden="true" />Registrar pagamento</Button> : null}

      <div className="mt-5 border-t pt-4">
        <p className="text-sm font-medium">Últimos pagamentos</p>
        {payments.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Carregando histórico...</p> : null}
        {!payments.isLoading && !(payments.data?.length) ? <p className="mt-2 text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p> : null}
        <ul className="mt-2 divide-y">
          {(payments.data ?? []).slice(0, 3).map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 text-sm">
                <p className="font-medium"><MoneyDisplay value={payment.amount} /></p>
                <p className="truncate text-xs text-muted-foreground">{formatDebtDate(payment.payment_date)}{payment.account_id ? " · " + (accountNames.get(payment.account_id) ?? "Conta") : ""}{payment.is_historical ? " · Já pago antes do saldo inicial" : ""}{payment.notes ? " · " + payment.notes : ""}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Remover pagamento" className="h-8 w-8" disabled={deletePayment.isPending} onClick={() => removePayment(payment.id, payment.is_historical)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
