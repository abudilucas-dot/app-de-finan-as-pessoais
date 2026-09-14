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
import { useCategories } from "@/hooks/useCategories";
import { useCreateCardExpense } from "@/hooks/useCreditCards";
import type { CreditCard } from "@/lib/creditCards";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";
import { localToday } from "@/lib/transactions";

export function CardExpenseDialog({
  open,
  onOpenChange,
  cards,
  defaultCard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CreditCard[];
  defaultCard?: CreditCard | null;
}) {
  const categories = useCategories("expense");
  const createExpense = useCreateCardExpense();
  const availableCards = useMemo(() => cards.filter((card) => !card.is_archived), [cards]);
  const [cardId, setCardId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0,00");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(localToday());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setCardId(defaultCard?.id ?? availableCards[0]?.id ?? "");
    setDescription("");
    setAmount("0,00");
    setCategoryId("");
    setDate(localToday());
    setNotes("");
  }, [availableCards, defaultCard?.id, open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = parseMoneyInput(amount);
    if (!cardId) return toast.error("Selecione um cartão.");
    if (!description.trim()) return toast.error("Informe uma descrição.");
    if (numericAmount <= 0) return toast.error("Informe um valor maior que zero.");
    if (!categoryId) return toast.error("Selecione uma categoria.");
    try {
      await createExpense.mutateAsync({
        creditCardId: cardId,
        description: description.trim(),
        amount: numericAmount,
        categoryId,
        transactionDate: date,
        notes,
      });
      toast.success("Compra no cartão registrada.");
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
          <DialogTitle>Nova compra no cartão</DialogTitle>
          <DialogDescription>
            A despesa conta na data da compra; a quitação da fatura não será uma segunda despesa.
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
          <div className="grid gap-4 sm:grid-cols-2">
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
              <Input
                id="card-expense-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
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
              disabled={createExpense.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createExpense.isPending || availableCards.length === 0}>
              {createExpense.isPending ? "Registrando..." : "Registrar compra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
