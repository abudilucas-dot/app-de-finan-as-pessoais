import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  CreditCard,
  Pencil,
  Trash2,
} from "lucide-react";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { Button } from "@/components/ui/button";
import type { FinancialTransaction } from "@/lib/transactions";
import { TRANSACTION_STATUS_LABELS, formatTransactionDate } from "@/lib/transactions";
import { cn } from "@/lib/utils";

export function TransactionItem({
  transaction,
  accountName,
  destinationAccountName,
  categoryName,
  cardName,
  debitCardName,
  onEdit,
  onDelete,
}: {
  transaction: FinancialTransaction;
  accountName?: string | undefined;
  destinationAccountName?: string | undefined;
  categoryName?: string | undefined;
  cardName?: string | undefined;
  debitCardName?: string | undefined;
  onEdit?: (transaction: FinancialTransaction) => void;
  onDelete?: (transaction: FinancialTransaction) => void;
}) {
  const Icon =
    transaction.type === "income"
      ? ArrowDownLeft
      : transaction.type === "expense"
        ? ArrowUpRight
        : transaction.type === "card_payment"
          ? CreditCard
          : ArrowRightLeft;
  const signedAmount =
    transaction.type === "income"
      ? transaction.amount
      : transaction.type === "expense"
        ? -transaction.amount
        : transaction.type === "card_payment"
          ? -transaction.amount
          : transaction.amount;
  const detail =
    transaction.type === "transfer"
      ? `${accountName ?? "Conta"} → ${destinationAccountName ?? "Conta"}`
      : transaction.type === "card_payment"
        ? `${accountName ?? "Conta"} · Pagamento de fatura`
        : transaction.credit_card_id
          ? `${categoryName ?? "Sem categoria"} · ${cardName ?? "Cartão"}`
          : transaction.debit_card_id
            ? `${categoryName ?? "Sem categoria"} · ${debitCardName ?? "Cartão de débito"}`
            : `${categoryName ?? "Sem categoria"} · ${accountName ?? "Conta"}`;
  const managedByCard = Boolean(transaction.credit_card_id || transaction.invoice_id);

  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b py-4 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          transaction.type === "income" && "bg-positive/10 text-positive",
          transaction.type === "expense" && "bg-negative/10 text-negative",
          transaction.type === "card_payment" && "bg-primary/10 text-primary",
          transaction.type === "transfer" && "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{transaction.description}</h3>
          {transaction.status !== "confirmed" ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                transaction.status === "pending" && "bg-warning/10 text-warning",
                transaction.status === "overdue" && "bg-negative/10 text-negative",
                transaction.status === "cancelled" && "bg-muted text-muted-foreground",
              )}
            >
              {TRANSACTION_STATUS_LABELS[transaction.status]}
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {detail} · {formatTransactionDate(transaction.transaction_date)}
        </p>
      </div>
      <div className="col-span-2 flex shrink-0 items-center justify-end gap-1 sm:col-span-1">
        <MoneyDisplay
          value={signedAmount}
          signed={transaction.type !== "transfer"}
          className={cn(
            "mr-1 text-sm font-semibold",
            transaction.status === "cancelled" && "line-through opacity-60",
          )}
        />
        {onEdit && !managedByCard ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar ${transaction.description}`}
            onClick={() => onEdit(transaction)}
          >
            <Pencil />
          </Button>
        ) : null}
        {onDelete && !managedByCard ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Excluir ${transaction.description}`}
            onClick={() => onDelete(transaction)}
          >
            <Trash2 />
          </Button>
        ) : null}
      </div>
    </article>
  );
}
