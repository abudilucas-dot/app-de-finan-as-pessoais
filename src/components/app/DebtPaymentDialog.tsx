import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Account } from "@/hooks/useAccounts";
import { useCreateDebtPayment } from "@/hooks/useDebts";
import type { DebtSummary } from "@/lib/debts";
import { todayDate } from "@/lib/goals";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";

export function DebtPaymentDialog({
  open,
  onOpenChange,
  debt,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: DebtSummary | null;
  accounts: Account[];
}) {
  const createPayment = useCreateDebtPayment();
  const [amount, setAmount] = useState("0,00");
  const [date, setDate] = useState(todayDate());
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [isHistorical, setIsHistorical] = useState(false);

  const activeAccounts = accounts.filter((account) => !account.is_archived);

  useEffect(() => {
    if (!open) return;
    setAmount("0,00");
    setDate(todayDate());
    setAccountId(activeAccounts[0]?.id ?? "");
    setNotes("");
    setIsHistorical(false);
  }, [open, debt?.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!debt) return;
    const value = parseMoneyInput(amount);
    if (value <= 0) return toast.error("Informe um pagamento maior que zero.");
    if (value > Number(debt.remaining_amount)) return toast.error("O pagamento não pode ser maior que o saldo da dívida.");
    if (!accountId) return toast.error("Selecione a conta usada para o pagamento.");
    if (isHistorical && (!date || date >= todayDate())) return toast.error("O pagamento histórico precisa ter uma data anterior a hoje.");

    try {
      await createPayment.mutateAsync({
        debt_id: debt.id,
        account_id: accountId,
        amount: value,
        payment_date: date,
        notes: notes.trim() || null,
        is_historical: isHistorical,
      });
      toast.success(isHistorical ? "Parcela registrada no histórico sem alterar o saldo." : "Pagamento registrado e lançado como despesa.");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Não foi possível registrar o pagamento.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>{debt ? `Registre um pagamento de “${debt.name}” e escolha como ele afeta sua conta.` : "Registre um pagamento."}</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="debt-payment-value">Valor pago</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input id="debt-payment-value" inputMode="numeric" className="pl-10" value={amount} onChange={(event) => setAmount(maskMoneyInput(event.target.value))} autoFocus />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Conta usada</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
              <SelectContent>
                {activeAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-payment-date">Data</Label>
            <Input id="debt-payment-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox id="debt-payment-historical" checked={isHistorical} onCheckedChange={(checked) => setIsHistorical(checked === true)} />
            <div className="space-y-1">
              <Label htmlFor="debt-payment-historical" className="cursor-pointer">Já paguei antes de começar meu controle no Valune</Label>
              <p className="text-xs text-muted-foreground">A parcela fica como paga na dívida, sem gerar despesa nem alterar o saldo informado ao criar a conta. Use apenas se esse pagamento já estava incluído no saldo inicial.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-payment-notes">Observação (opcional)</Label>
            <Input id="debt-payment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createPayment.isPending}>Cancelar</Button>
            <Button type="submit" disabled={createPayment.isPending}>{createPayment.isPending ? "Registrando..." : "Registrar pagamento"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
