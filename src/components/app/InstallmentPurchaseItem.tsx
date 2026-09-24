import { ChevronDown, ChevronUp, CreditCard, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { Button } from "@/components/ui/button";
import { formatTransactionDate } from "@/lib/transactions";
import type { FinancialTransaction } from "@/lib/transactions";
import { cn } from "@/lib/utils";

function purchaseDescription(transaction: FinancialTransaction) {
  return transaction.description.replace(/ \(\d+\/\d+\)$/, "");
}

export function InstallmentPurchaseItem({
  installments,
  categoryName,
  cardName,
  onCancel,
  onEdit,
}: {
  installments: FinancialTransaction[];
  categoryName?: string;
  cardName?: string;
  onCancel: (transaction: FinancialTransaction) => void;
  onEdit: (transaction: FinancialTransaction) => void;
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
            {categoryName ?? "Sem categoria"} · {cardName ?? "Cartão"} · Toque para ver parcelas
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCancel(first)}
            aria-label={`Cancelar compra no cartão: ${description}`}
          >
            <Trash2 />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(first)}
            aria-label={`Editar compra no cartão: ${description}`}
          >
            <Pencil />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 rounded-xl border bg-muted/20 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{orderedInstallments.length} de {totalInstallments} parcelas ativas</span>
            <span>
              Total <MoneyDisplay value={total} />
            </span>
          </div>
          <div className="divide-y">
            {orderedInstallments.map((installment) => (
              <div
                key={installment.id}
                className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    Parcela {installment.installment_number ?? "—"}/{installment.total_installments ?? totalInstallments}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTransactionDate(installment.transaction_date)}
                  </p>
                </div>
                <MoneyDisplay value={-Number(installment.amount)} signed className={cn("shrink-0 font-semibold text-negative")} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
