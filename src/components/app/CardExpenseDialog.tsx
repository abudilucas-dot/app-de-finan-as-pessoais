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
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/useCategories";
import { useCreateCardExpense, useReplaceCreditCardPurchase } from "@/hooks/useCreditCards";
import type { CreditCard } from "@/lib/creditCards";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";
import { localToday } from "@/lib/transactions";

export type CardPurchaseDraft = {
  transactionId: string;
  creditCardId: string;
  description: string;
  amount: number;
  categoryId: string;
  transactionDate: string;
  totalInstallments: number;
  notes: string | null;
};

export function CardExpenseDialog({
  open,
  onOpenChange,
  cards,
  defaultCard,
  purchase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CreditCard[];
  defaultCard?: CreditCard | null;
  purchase?: CardPurchaseDraft | null;
}) {
  const categories = useCategories("expense");
  const createExpense = useCreateCardExpense();
  const replaceExpense = useReplaceCreditCardPurchase();
  const availableCards = useMemo(() => cards.filter((card) => !card.is_archived), [cards]);
  const [cardId, setCardId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0,00");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(localToday());
  const [totalInstallments, setTotalInstallments] = useState("1");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setCardId(purchase?.creditCardId ?? defaultCard?.id ?? availableCards[0]?.id ?? "");
    setDescription(purchase?.description ?? "");
    setAmount(purchase ? maskMoneyInput(String(Math.round(purchase.amount * 100))) : "0,00");
    setCategoryId(purchase?.categoryId ?? "");
    setDate(purchase?.transactionDate ?? localToday());
    setTotalInstallments(String(purchase?.totalInstallments ?? 1));
    setNotes(purchase?.notes ?? "");
  }, [availableCards, defaultCard?.id, open, purchase]);

  const saving = createExpense.isPending || replaceExpense.isPending;

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const numericAmount = parseMoneyInput(amount);
    if (!cardId) {
      toast.error("Selecione um cartão.");
      return;
    }
    if (!description.trim()) {
      toast.error("Informe uma descrição.");
      return;
    }
    if (numericAmount <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    if (!categoryId) {
      toast.error("Selecione uma categoria.");
      return;
    }
    const installments = Number(totalInstallments);
    if (!Number.isInteger(installments) || installments < 1 || installments > 60) {
      toast.error("Informe entre 1 e 60 parcelas.");
      return;
    }
    try {
      const values = {
        creditCardId: cardId,
        description: description.trim(),
        amount: numericAmount,
        categoryId,
        transactionDate: date,
        totalInstallments: installments,
        notes,
      };
      if (purchase) {
        await replaceExpense.mutateAsync({ transactionId: purchase.transactionId, ...values });
      } else {
        await createExpense.mutateAsync(values);
      }
      toast.success(
        purchase
          ? "Compra no cartão atualizada."
          : installments > 1
            ? `Compra registrada em ${installments} parcelas.`
            : "Compra no cartão registrada.",
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.includes("available card limit")
          ? "Esta compra ultrapassa o limite disponível."
          : "Não foi possível registrar a compra.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {purchase ? "Editar compra no cartão" : "Nova compra no cartão"}
          </DialogTitle>
          <DialogDescription>
            {purchase
              ? "A compra inteira será recalculada com suas parcelas e faturas correspondentes."
              : "A despesa conta na data da compra; a quitação da fatura não será uma segunda despesa."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="expense-card">Cartão</Label>
            <Select value={cardId} onValueChange={setCardId}>
              <SelectTrigger id="expense-card" className="min-h-11">
                <SelectValue placeholder="Selecione um cartão" />
              </SelectTrigger>
              <SelectContent>
                {availableCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                    {card.institution ? ` · ${card.institution}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-expense-description">Descrição</Label>
            <Input
              id="card-expense-description"
              autoFocus
              required
              maxLength={160}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Mercado"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="card-expense-amount">Valor</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="card-expense-amount"
                  inputMode="numeric"
                  className="pl-10"
                  value={amount}
                  onChange={(e) => setAmount(maskMoneyInput(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-expense-date">Data da compra</Label>
              <DateInput
                id="card-expense-date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-expense-installments">Parcelas</Label>
              <Input
                id="card-expense-installments"
                type="number"
                min="1"
                max="60"
                inputMode="numeric"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                O limite usa o valor total; cada parcela vai para a fatura correta.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-expense-category">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="card-expense-category" className="min-h-11">
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
          <div className="space-y-2">
            <Label htmlFor="card-expense-notes">Observações (opcional)</Label>
            <Textarea
              id="card-expense-notes"
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            <Button type="submit" disabled={saving || availableCards.length === 0}>
              {saving ? "Salvando..." : purchase ? "Salvar compra" : "Registrar compra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
