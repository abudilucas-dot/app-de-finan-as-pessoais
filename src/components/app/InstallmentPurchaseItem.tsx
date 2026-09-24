import { ChevronDown, ChevronUp, CreditCard, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { Button } from "@/components/ui/button";
import type { CreditCardInvoice } from "@/lib/creditCards";
import { formatTransactionDate } from "@/lib/transactions";
import type { FinancialTransaction } from "@/lib/transactions";
import { cn } from "@/lib/utils";

function purchaseDescription(transaction: FinancialTransaction) {
  return transaction.description.replace(/ \(\d+\/\d+\)$/, "");
}

export function InstallmentPurchaseItem({
  installments,
  invoicesById,
  categoryName,
  cardName,
  onCancel,
  onEdit,
}: {
  installments: FinancialTransaction[];
  invoicesById: ReadonlyMap<string, CreditCardInvoice>;
  categoryName?: string;
  cardName?: string;
  onCancel?: (transaction: FinancialTransaction) => void;
  onEdit?: (transaction: FinancialTransaction) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const orderedInstallments = [...installments].sort(
    (left, right) => (left.installment_number ?? 0) - (right.installment_number ?? 0),
  );
  const first = orderedInstallments[0];
  if (!first) return null;

  const total = orderedInstallments.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalInstallments = first.total_installments ?? orderedInstallments.length;
  const description = purchaseDescription(first);
  const paidInstallments = orderedInstallments.filter(
    (installment) => invoicesById.get(installment.invoice_id ?? "")?.status === "paid",
  );
  const openInstallments = orderedInstallments.filter(
    (installment) => invoicesById.get(installment.invoice_id ?? "")?.status !== "paid",
  );
  const openTotal = openInstallments.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <article className="border-b py-4 last:border-b-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-negative/10 text-negative">
          <CreditCard className="h-5 w-5" aria-hidden="true" />
        </span>

        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Ocultar" : "Ver"} parcelas de ${description}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{description}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {totalInstallments}x
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {categoryName ?? "Sem categoria"} · {cardName ?? "Cartão"} · {paidInstallments.length} paga{paidInstallments.length === 1 ? "" : "s"} · {openInstallments.length} em aberto
          </p>
        </button>

        <div className="col-span-2 flex shrink-0 items-center justify-end gap-1 sm:col-span-1">
          <MoneyDisplay
            value={-total}
            signed
            className="mr-1 text-sm font-semibold text-negative"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded((value) => !value)}
            aria-label={`${expanded ? "Ocultar" : "Ver"} parcelas de ${description}`}
          >
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
          {onCancel ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCancel(first)}
              aria-label={`Cancelar compra no cartão: ${description}`}
            >
              <Trash2 />
            </Button>
          ) : null}
          {onEdit ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(first)}
              aria-label={`Editar compra no cartão: ${description}`}
            >
              <Pencil />
            </Button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 rounded-xl border bg-muted/20 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {paidInstallments.length} paga{paidInstallments.length === 1 ? "" : "s"} · {openInstallments.length} em aberto
            </span>
            <span>
              Em aberto <MoneyDisplay value={openTotal} />
            </span>
          </div>
          <div className="divide-y">
            {orderedInstallments.map((installment) => {
              const invoice = invoicesById.get(installment.invoice_id ?? "");
              const isPaid = invoice?.status === "paid";
              const referenceDate = isPaid
                ? (invoice?.paid_at?.slice(0, 10) ?? invoice?.due_date ?? installment.transaction_date)
                : (invoice?.due_date ?? installment.transaction_date);

              return (
                <div
                  key={installment.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        Parcela {installment.installment_number ?? "—"}/{installment.total_installments ?? totalInstallments}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          isPaid
                            ? "bg-positive/10 text-positive"
                            : "bg-warning/10 text-warning",
                        )}
                      >
                        {isPaid ? "Paga" : "Em aberto"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isPaid ? "Paga em" : "Vence em"} {formatTransactionDate(referenceDate)}
                    </p>
                  </div>
                  <MoneyDisplay value={-Number(installment.amount)} signed className="shrink-0 font-semibold text-negative" />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}
