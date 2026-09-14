import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Account } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useDebitCards } from "@/hooks/useDebitCards";
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/useTransactions";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";
import {
  type FinancialTransaction,
  type DirectTransactionType,
  type TransactionStatus,
  localToday,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { value: DirectTransactionType; label: string }[] = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
  { value: "transfer", label: "Transferência" },
];

function moneyInputFromNumber(value: number) {
  return maskMoneyInput(String(Math.round(Number(value) * 100)));
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: FinancialTransaction | null;
  accounts: Account[];
}) {
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const [type, setType] = useState<DirectTransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0,00");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [debitCardId, setDebitCardId] = useState("none");
  const [date, setDate] = useState(localToday());
  const [status, setStatus] = useState<TransactionStatus>("confirmed");
  const [notes, setNotes] = useState("");
  const categoryType = type === "income" ? "income" : "expense";
  const categories = useCategories(categoryType);
  const debitCards = useDebitCards();

  const availableAccounts = useMemo(
    () =>
      accounts.filter((account) => !account.is_archived || account.id === transaction?.account_id),
    [accounts, transaction?.account_id],
  );

  useEffect(() => {
    if (!open) return;
    const nextType =
      transaction?.type === "income" || transaction?.type === "transfer"
        ? transaction.type
        : "expense";
    setType(nextType);
    setDescription(transaction?.description ?? "");
    setAmount(transaction ? moneyInputFromNumber(transaction.amount) : "0,00");
    setCategoryId(transaction?.category_id ?? "");
    setAccountId(
      transaction?.account_id ?? accounts.find((account) => !account.is_archived)?.id ?? "",
    );
    setDestinationAccountId(transaction?.destination_account_id ?? "");
    setDebitCardId(transaction?.debit_card_id ?? "none");
    setDate(transaction?.transaction_date ?? localToday());
    setStatus(transaction?.status ?? "confirmed");
    setNotes(transaction?.notes ?? "");
  }, [accounts, open, transaction]);

  const saving = createTransaction.isPending || updateTransaction.isPending;

  const changeType = (nextType: DirectTransactionType) => {
    setType(nextType);
    setCategoryId("");
    setDestinationAccountId("");
    setDebitCardId("none");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = parseMoneyInput(amount);

    if (!description.trim()) {
      toast.error("Informe uma descrição.");
      return;
    }
    if (numericAmount <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    if (!accountId) {
      toast.error("Selecione uma conta.");
      return;
    }
    if (type === "transfer") {
      if (!destinationAccountId) {
        toast.error("Selecione a conta de destino.");
        return;
      }
      if (destinationAccountId === accountId) {
        toast.error("A conta de destino precisa ser diferente da origem.");
        return;
      }
    } else if (!categoryId) {
      toast.error("Selecione uma categoria.");
      return;
    }

    const values = {
      type,
      description: description.trim(),
      amount: numericAmount,
      category_id: type === "transfer" ? null : categoryId,
      account_id: accountId,
      destination_account_id: type === "transfer" ? destinationAccountId : null,
      debit_card_id: type === "expense" && debitCardId !== "none" ? debitCardId : null,
      transaction_date: date,
      status,
      notes: notes.trim() || null,
    };

    try {
      if (transaction) {
        await updateTransaction.mutateAsync({ id: transaction.id, values });
      } else {
        await createTransaction.mutateAsync(values);
      }
      toast.success(transaction ? "Movimentação atualizada." : "Movimentação adicionada.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar a movimentação.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{transaction ? "Editar movimentação" : "Nova movimentação"}</DialogTitle>
          <DialogDescription>
            Registre uma receita, despesa ou transferência entre suas contas.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tipo</legend>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={type === option.value}
                  onClick={() => changeType(option.value)}
                  className={cn(
                    "min-h-11 rounded-lg border px-2 text-sm font-medium transition-colors",
                    type === option.value
                      ? "border-primary bg-accent text-accent-foreground"
                      : "hover:bg-muted/60",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="transaction-description">Descrição</Label>
            <Input
              id="transaction-description"
              required
              maxLength={160}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={
                type === "income"
                  ? "Ex.: Salário"
                  : type === "expense"
                    ? "Ex.: Mercado"
                    : "Ex.: Enviar para carteira"
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transaction-amount">Valor</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="transaction-amount"
                  inputMode="numeric"
                  className="pl-10"
                  value={amount}
                  onChange={(event) => setAmount(maskMoneyInput(event.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction-date">Data</Label>
              <Input
                id="transaction-date"
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-account">
              {type === "transfer" ? "Conta de origem" : "Conta"}
            </Label>
            <Select
              value={accountId}
              onValueChange={(nextAccountId) => {
                setAccountId(nextAccountId);
                const selectedDebitCard = (debitCards.data ?? []).find(
                  (card) => card.id === debitCardId,
                );
                if (selectedDebitCard && selectedDebitCard.account_id !== nextAccountId) {
                  setDebitCardId("none");
                }
              }}
            >
              <SelectTrigger id="source-account" className="min-h-11">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {availableAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "expense" ? (
            <div className="space-y-2">
              <Label htmlFor="transaction-debit-card">Pagamento no débito (opcional)</Label>
              <Select value={debitCardId} onValueChange={setDebitCardId}>
                <SelectTrigger id="transaction-debit-card" className="min-h-11">
                  <SelectValue placeholder="Selecione um cartão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Usar saldo da conta</SelectItem>
                  {(debitCards.data ?? [])
                    .filter((card) => !card.is_archived && card.account_id === accountId)
                    .map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O valor sai da conta selecionada imediatamente.
              </p>
            </div>
          ) : null}

          {type === "transfer" ? (
            <div className="space-y-2">
              <Label htmlFor="destination-account">Conta de destino</Label>
              <Select value={destinationAccountId} onValueChange={setDestinationAccountId}>
                <SelectTrigger id="destination-account" className="min-h-11">
                  <SelectValue placeholder="Selecione o destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((account) => !account.is_archived && account.id !== accountId)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="transaction-category">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="transaction-category" className="min-h-11">
                  <SelectValue
                    placeholder={categories.isLoading ? "Carregando..." : "Selecione uma categoria"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="transaction-status">Situação</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as TransactionStatus)}>
              <SelectTrigger id="transaction-status" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmada</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                {transaction?.status === "overdue" ? (
                  <SelectItem value="overdue">Atrasada</SelectItem>
                ) : null}
                {transaction?.status === "cancelled" ? (
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Movimentações pendentes não alteram o saldo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-notes">Observações (opcional)</Label>
            <Textarea
              id="transaction-notes"
              maxLength={1000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Informações adicionais"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || accounts.length === 0}>
              {saving ? "Salvando..." : "Salvar movimentação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
