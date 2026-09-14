import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateGoal, useUpdateGoal } from "@/hooks/useGoals";
import type { FinancialGoal } from "@/lib/goals";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: FinancialGoal | null;
}) {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("0,00");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState("#0F766E");

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setTargetAmount(goal ? maskMoneyInput(String(Math.round(Number(goal.target_amount) * 100))) : "0,00");
    setTargetDate(goal?.target_date ?? "");
    setColor(goal?.color ?? "#0F766E");
  }, [goal, open]);

  const saving = createGoal.isPending || updateGoal.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = parseMoneyInput(targetAmount);
    if (!name.trim()) return toast.error("Informe o nome da meta.");
    if (amount <= 0) return toast.error("Informe um valor-alvo maior que zero.");

    try {
      const values = { name: name.trim(), target_amount: amount, target_date: targetDate || null, color };
      if (goal) await updateGoal.mutateAsync({ id: goal.id, values });
      else await createGoal.mutateAsync(values);
      toast.success(goal ? "Meta atualizada." : "Meta criada.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar a meta.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>Defina um objetivo e acompanhe cada aporte até alcançá-lo.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="goal-name">Nome da meta</Label>
            <Input id="goal-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Notebook novo" maxLength={100} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-target">Valor-alvo</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input id="goal-target" inputMode="numeric" className="pl-10" value={targetAmount} onChange={(event) => setTargetAmount(maskMoneyInput(event.target.value))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="goal-date">Prazo (opcional)</Label>
              <Input id="goal-date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-color">Cor</Label>
              <Input id="goal-color" type="color" className="h-9 w-16 p-1" value={color} onChange={(event) => setColor(event.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : goal ? "Salvar" : "Criar meta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
