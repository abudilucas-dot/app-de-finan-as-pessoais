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
import type { Account } from "@/hooks/useAccounts";
import { useCreateCreditCard, useUpdateCreditCard } from "@/hooks/useCreditCards";
import { CREDIT_CARD_COLORS, type CreditCard } from "@/lib/creditCards";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";

function moneyInputFromNumber(value: number) {
  return maskMoneyInput(String(Math.round(Number(value) * 100)));
}

export function CreditCardFormDialog({
  open,
  onOpenChange,
  card,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard | null;
  accounts: Account[];
}) {
  const createCard = useCreateCreditCard();
  const updateCard = useUpdateCreditCard();
  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.is_archived),
    [accounts],
  );
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [brand, setBrand] = useState("");
  const [limit, setLimit] = useState("0,00");
  const [closingDay, setClosingDay] = useState("10");
  const [dueDay, setDueDay] = useState("17");
  const [paymentAccountId, setPaymentAccountId] = useState("none");
  const [color, setColor] = useState<string>(CREDIT_CARD_COLORS[0]);

  useEffect(() => {
    if (!open) return;
    setName(card?.name ?? "");
    setInstitution(card?.institution ?? "");
    setBrand(card?.brand ?? "");
    setLimit(card ? moneyInputFromNumber(card.total_limit) : "0,00");
    setClosingDay(String(card?.closing_day ?? 10));
    setDueDay(String(card?.due_day ?? 17));
    setPaymentAccountId(card?.default_payment_account_id ?? "none");
    setColor(card?.color ?? CREDIT_CARD_COLORS[0]);
  }, [card, open]);

  const saving = createCard.isPending || updateCard.isPending;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const totalLimit = parseMoneyInput(limit);
    const close = Number(closingDay);
    const due = Number(dueDay);
    if (!name.trim()) return toast.error("Informe um nome para o cartão.");
    if (totalLimit <= 0) return toast.error("Informe um limite maior que zero.");
    if (!Number.isInteger(close) || close < 1 || close > 31) {
      return toast.error("O dia de fechamento deve estar entre 1 e 31.");
    }
    if (!Number.isInteger(due) || due < 1 || due > 31) {
      return toast.error("O dia de vencimento deve estar entre 1 e 31.");
    }

    const values = {
      name: name.trim(),
      institution: institution.trim() || null,
      brand: brand.trim() || null,
      total_limit: totalLimit,
      closing_day: close,
      due_day: due,
      default_payment_account_id: paymentAccountId === "none" ? null : paymentAccountId,
      color,
    };

    try {
      if (card) await updateCard.mutateAsync({ id: card.id, ...values });
      else await createCard.mutateAsync(values);
      toast.success(card ? "Cartão atualizado." : "Cartão criado.");
      onOpenChange(false);
    } catch {
      toast.error(
        card ? "Não foi possível atualizar o cartão." : "Não foi possível criar o cartão.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{card ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          <DialogDescription>
            Cadastre o limite, fechamento e vencimento da fatura.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="card-name">Nome do cartão</Label>
            <Input
              id="card-name"
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Nubank Platinum"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="card-institution">Instituição (opcional)</Label>
              <Input
                id="card-institution"
                maxLength={80}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ex.: Nubank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-brand">Bandeira (opcional)</Label>
              <Input
                id="card-brand"
                maxLength={40}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex.: Mastercard"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-limit">Limite total</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                id="card-limit"
                inputMode="numeric"
                className="pl-10"
                value={limit}
                onChange={(e) => setLimit(maskMoneyInput(e.target.value))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="card-closing-day">Dia de fechamento</Label>
              <Input
                id="card-closing-day"
                type="number"
                min="1"
                max="31"
                inputMode="numeric"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-due-day">Dia de vencimento</Label>
              <Input
                id="card-due-day"
                type="number"
                min="1"
                max="31"
                inputMode="numeric"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-payment-account">Conta padrão para pagamento</Label>
            <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
              <SelectTrigger id="card-payment-account" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecionar depois</SelectItem>
                {activeAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Cor do cartão</legend>
            <div className="flex flex-wrap gap-2">
              {CREDIT_CARD_COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-label={`Selecionar cor ${item}`}
                  aria-pressed={color === item}
                  onClick={() => setColor(item)}
                  style={{ backgroundColor: item }}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-transform",
                    color === item ? "scale-110 border-foreground" : "border-transparent",
                  )}
                />
              ))}
            </div>
          </fieldset>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : card ? "Salvar alterações" : "Criar cartão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
