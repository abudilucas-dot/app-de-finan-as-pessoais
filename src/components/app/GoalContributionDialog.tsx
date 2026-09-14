import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Account } from "@/hooks/useAccounts";
import { useCreateGoalContribution } from "@/hooks/useGoals";
import { todayDate, type GoalSummary } from "@/lib/goals";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";

export function GoalContributionDialog({
  open,
  onOpenChange,
  goal,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: GoalSummary | null;
  accounts: Account[];
}) {
  const createContribution = useCreateGoalContribution();
  const [amount, setAmount] = useState("0,00");
  const [date, setDate] = useState(todayDate());
  const [accountId, setAccountId] = useState("none");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount("0,00");
    setDate(todayDate());
    setAccountId("none");
    setNotes("");
  }, [open, goal?.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!goal) return;
    const value = parseMoneyInput(amount);
    if (value <= 0) return toast.error("Informe um aporte maior que zero.");

    try {
      await createContribution.mutateAsync({
        goal_id: goal.id,
        amount: value,
        contribution_date: date,
        account_id: accountId === "none" ? null : accountId,
        notes: notes.trim() || null,
      });
      toast.success("Aporte adicionado à meta.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível adicionar o aporte.");
    }
  };

  const activeAccounts = accounts.filter((account) => !account.is_archived);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar aporte</DialogTitle>
          <DialogDescription>{goal ? `Registre quanto você separou para “${goal.name}”.` : "Registre o valor reservado."}</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="contribution-value">Valor do aporte</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input id="contribution-value" inputMode="numeric" className="pl-10" value={amount} onChange={(event) => setAmount(maskMoneyInput(event.target.value))} autoFocus />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contribution-date">Data</Label>
            <Input id="contribution-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Conta de origem (opcional)</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Não informar conta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informar conta</SelectItem>
                {activeAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">O aporte acompanha a meta; ele não altera o saldo da conta.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contribution-notes">Observação (opcional)</Label>
            <Input id="contribution-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: dinheiro separado do salário" maxLength={240} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createContribution.isPending}>Cancelar</Button>
            <Button type="submit" disabled={createContribution.isPending}>{createContribution.isPending ? "Salvando..." : "Adicionar aporte"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
