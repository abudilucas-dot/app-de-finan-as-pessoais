import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Account } from "@/hooks/useAccounts";
import type { Category } from "@/hooks/useCategories";
import { useCreateRecurringRule, useUpdateRecurringRule } from "@/hooks/useRecurringRules";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";
import { type RecurringFrequency, type RecurringRule, recurringFrequencyLabels, todayDate } from "@/lib/recurringRules";
import { cn } from "@/lib/utils";

const frequencies = Object.entries(recurringFrequencyLabels) as [RecurringFrequency, string][];

function moneyInputFromNumber(value: number) {
  return maskMoneyInput(String(Math.round(Number(value) * 100)));
}

export function RecurringRuleFormDialog({
  open,
  onOpenChange,
  rule,
  accounts,
  categories,
  mode = "recurrence",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: RecurringRule | null;
  accounts: Account[];
  categories: Category[];
  mode?: "recurrence" | "subscription";
}) {
  const createRule = useCreateRecurringRule();
  const isSubscription = mode === "subscription" || Boolean(rule?.is_subscription);
  const updateRule = useUpdateRecurringRule();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0,00");
  const [categoryId, setCategoryId] = useState("none");
  const [accountId, setAccountId] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [nextOccurrence, setNextOccurrence] = useState(todayDate());
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const availableAccounts = useMemo(
    () => accounts.filter((account) => !account.is_archived || account.id === rule?.account_id),
    [accounts, rule?.account_id],
  );
  const compatibleCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  useEffect(() => {
    if (!open) return;
    setType(isSubscription ? "expense" : (rule?.type ?? "expense"));
    setDescription(rule?.description ?? "");
    setAmount(rule ? moneyInputFromNumber(rule.amount) : "0,00");
    setCategoryId(rule?.category_id ?? "none");
    setAccountId(rule?.account_id ?? accounts.find((account) => !account.is_archived)?.id ?? "");
    setFrequency(rule?.frequency ?? "monthly");
    setNextOccurrence(rule?.next_occurrence ?? todayDate());
    setEndDate(rule?.end_date ?? "");
    setNotes(rule?.notes ?? "");
  }, [accounts, isSubscription, open, rule]);

  const saving = createRule.isPending || updateRule.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const numericAmount = parseMoneyInput(amount);

    if (!description.trim()) return toast.error("Informe uma descrição.");
    if (numericAmount <= 0) return toast.error("Informe um valor maior que zero.");
    if (!accountId) return toast.error("Selecione a conta que receberá ou pagará este lançamento.");
    if (type === "expense" && categoryId === "none") {
      return toast.error("Selecione a categoria da despesa.");
    }
    if (!nextOccurrence) return toast.error("Informe a primeira data programada.");
    if (endDate && endDate < nextOccurrence) {
      return toast.error("A data final não pode ser anterior à primeira ocorrência.");
    }

    const values = {
      description: description.trim(),
      amount: numericAmount,
      type,
      category_id: categoryId === "none" ? null : categoryId,
      account_id: accountId,
      frequency,
      next_occurrence: nextOccurrence,
      end_date: endDate || null,
      notes: notes.trim() || null,
      is_subscription: isSubscription,
    };

    try {
      if (rule) await updateRule.mutateAsync({ id: rule.id, values });
      else await createRule.mutateAsync(values);
      toast.success(rule ? (isSubscription ? "Assinatura atualizada." : "Conta programada atualizada.") : (isSubscription ? "Assinatura criada." : "Conta programada criada."));
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar a conta programada.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{rule ? (isSubscription ? "Editar assinatura" : "Editar conta programada") : (isSubscription ? "Nova assinatura" : "Nova conta programada")}</DialogTitle>
          <DialogDescription>
            {isSubscription ? "A cobrança só altera seu saldo quando você confirmá-la como paga." : "O lançamento só altera seus dados financeiros quando você confirmá-lo como pago ou recebido."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submit}>
          {!isSubscription ? <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tipo</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["expense", "Despesa"],
                ["income", "Receita"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={type === value}
                  onClick={() => {
                    setType(value as "income" | "expense");
                    setCategoryId("none");
                  }}
                  className={cn(
                    "min-h-11 rounded-lg border px-3 text-sm font-medium transition-colors",
                    type === value
                      ? "border-primary bg-accent text-accent-foreground"
                      : "hover:bg-muted/60",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset> : null}

          <div className="space-y-2">
            <Label htmlFor="recurring-description">Descrição</Label>
            <Input id="recurring-description" required maxLength={140} autoFocus value={description} onChange={(event) => setDescription(event.target.value)} placeholder={isSubscription ? "Ex.: Netflix" : (type === "income" ? "Ex.: Salário" : "Ex.: Internet")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recurring-amount">Valor</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input id="recurring-amount" inputMode="numeric" className="pl-10" value={amount} onChange={(event) => setAmount(maskMoneyInput(event.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-frequency">Frequência</Label>
              <Select value={frequency} onValueChange={(value) => setFrequency(value as RecurringFrequency)}>
                <SelectTrigger id="recurring-frequency" className="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{frequencies.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurring-account">Conta</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="recurring-account" className="min-h-11"><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
              <SelectContent>{availableAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurring-category">Categoria {type === "income" ? "(opcional)" : ""}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="recurring-category" className="min-h-11"><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
              <SelectContent>
                {type === "income" ? <SelectItem value="none">Sem categoria</SelectItem> : null}
                {compatibleCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recurring-next-date">{isSubscription ? "Próxima cobrança" : "Primeira ocorrência"}</Label>
              <Input id="recurring-next-date" type="date" required value={nextOccurrence} onChange={(event) => setNextOccurrence(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-end-date">Até quando (opcional)</Label>
              <Input id="recurring-end-date" type="date" min={nextOccurrence} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurring-notes">Observações (opcional)</Label>
            <Textarea id="recurring-notes" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Informações adicionais" />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || availableAccounts.length === 0}>{saving ? "Salvando..." : (isSubscription ? "Salvar assinatura" : "Salvar programação")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
