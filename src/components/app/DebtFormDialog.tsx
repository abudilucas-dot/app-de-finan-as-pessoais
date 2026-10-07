import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { useCreateDebt, useUpdateDebt } from "@/hooks/useDebts";
import type { DebtSummary } from "@/lib/debts";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";

const moneyText = (value: number | null) => maskMoneyInput(String(Math.round(Number(value ?? 0) * 100)));

export function DebtFormDialog({
  open,
  onOpenChange,
  debt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: DebtSummary | null;
}) {
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();
  const isEditing = Boolean(debt);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [initialAmount, setInitialAmount] = useState("0,00");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(debt?.name ?? "");
    setInstitution(debt?.institution ?? "");
    setInitialAmount(moneyText(debt?.initial_amount ?? 0));
    setInstallmentAmount(debt?.installment_amount ? moneyText(debt.installment_amount) : "");
    setInterestRate(debt?.interest_rate?.toString() ?? "");
    setTotalInstallments(debt?.total_installments?.toString() ?? "");
    setDueDay(debt?.due_day?.toString() ?? "");
    setNextDueDate(debt?.next_due_date ?? "");
    setNotes(debt?.notes ?? "");
  }, [open, debt]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = parseMoneyInput(initialAmount);
    const installment = installmentAmount ? parseMoneyInput(installmentAmount) : null;
    const installments = totalInstallments ? Number(totalInstallments) : null;
    const day = dueDay ? Number(dueDay) : null;
    const rate = interestRate ? Number(interestRate.replace(",", ".")) : null;

    if (!name.trim()) return toast.error("Informe o nome da dívida.");
    if (!isEditing && amount <= 0) return toast.error("Informe o valor total devido.");
    if (installment !== null && installment <= 0) return toast.error("Informe uma parcela válida.");
    if (installments !== null && (!Number.isInteger(installments) || installments < 1)) return toast.error("Informe a quantidade de parcelas.");
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) return toast.error("Informe um dia de vencimento entre 1 e 31.");
    if (rate !== null && (!Number.isFinite(rate) || rate < 0)) return toast.error("Informe uma taxa de juros válida.");

    const values = {
      name: name.trim(),
      institution: institution.trim() || null,
      ...(isEditing ? {} : { initial_amount: amount, remaining_amount: amount }),
      installment_amount: installment,
      interest_rate: rate,
      total_installments: installments,
      due_day: day,
      next_due_date: nextDueDate || null,
      notes: notes.trim() || null,
    };

    try {
      if (debt) {
        await updateDebt.mutateAsync({ id: debt.id, values });
        toast.success("Dívida atualizada.");
      } else {
        await createDebt.mutateAsync(values as Parameters<typeof createDebt.mutateAsync>[0]);
        toast.success("Dívida cadastrada.");
      }
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar a dívida.");
    }
  };

  const saving = createDebt.isPending || updateDebt.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar dívida" : "Nova dívida"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados de vencimento ou identificação." : "Cadastre empréstimos, financiamentos ou valores que você ainda precisa pagar."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="debt-name">Nome</Label>
            <Input id="debt-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Financiamento do carro" maxLength={120} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-institution">Instituição ou pessoa (opcional)</Label>
            <Input id="debt-institution" value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Ex.: Banco ou nome da pessoa" maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-initial">{isEditing ? "Valor total original" : "Valor total devido"}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input id="debt-initial" className="pl-10" inputMode="numeric" value={initialAmount} onChange={(event) => setInitialAmount(maskMoneyInput(event.target.value))} disabled={isEditing} />
            </div>
            {isEditing ? <p className="text-xs text-muted-foreground">O valor original não pode ser alterado após pagamentos; isso preserva o histórico.</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="debt-installment">Parcela (opcional)</Label>
              <Input id="debt-installment" inputMode="numeric" value={installmentAmount} onChange={(event) => setInstallmentAmount(maskMoneyInput(event.target.value))} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-installments">Nº de parcelas</Label>
              <Input id="debt-installments" type="number" min="1" step="1" value={totalInstallments} onChange={(event) => setTotalInstallments(event.target.value)} placeholder="Ex.: 24" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="debt-day">Dia de vencimento</Label>
              <Input id="debt-day" type="number" min="1" max="31" value={dueDay} onChange={(event) => setDueDay(event.target.value)} placeholder="Ex.: 10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-date">Próximo vencimento</Label>
              <DateInput id="debt-date" value={nextDueDate} onChange={(event) => setNextDueDate(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-rate">Juros mensais (%)</Label>
            <Input id="debt-rate" inputMode="decimal" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-notes">Observação (opcional)</Label>
            <Input id="debt-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} placeholder="Ex.: contrato renegociado" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar dívida"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
