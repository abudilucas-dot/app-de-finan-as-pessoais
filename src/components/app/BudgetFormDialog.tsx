import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "@/hooks/useCategories";
import { useCreateBudget, useUpdateBudget } from "@/hooks/useBudgets";
import type { Budget } from "@/lib/budgets";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";

export function BudgetFormDialog({
  open, onOpenChange, budget, categories, periodStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget | null;
  categories: Category[];
  periodStart: string;
}) {
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("0,00");

  useEffect(() => {
    if (!open) return;
    setCategoryId(budget?.category_id ?? "");
    setAmount(budget ? maskMoneyInput(String(Math.round(Number(budget.amount_limit) * 100))) : "0,00");
  }, [budget, open]);

  const saving = createBudget.isPending || updateBudget.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amountLimit = parseMoneyInput(amount);
    if (!categoryId) return toast.error("Selecione uma categoria.");
    if (amountLimit <= 0) return toast.error("Informe um limite maior que zero.");
    try {
      if (budget) {
        await updateBudget.mutateAsync({ id: budget.id, amount_limit: amountLimit });
      } else {
        await createBudget.mutateAsync({ category_id: categoryId, period_start: periodStart, amount_limit: amountLimit });
      }
      toast.success(budget ? "Orçamento atualizado." : "Orçamento criado.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.includes("duplicate")
          ? "Esta categoria já possui um orçamento neste mês."
          : "Não foi possível salvar o orçamento.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
          <DialogDescription>Defina quanto deseja gastar nesta categoria no mês.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="budget-category">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={Boolean(budget)}>
              <SelectTrigger id="budget-category" className="min-h-11"><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
              <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-limit">Limite mensal</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input id="budget-limit" inputMode="numeric" className="pl-10" value={amount} onChange={(event) => setAmount(maskMoneyInput(event.target.value))} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : budget ? "Salvar" : "Criar orçamento"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
