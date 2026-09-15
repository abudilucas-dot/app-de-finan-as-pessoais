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
import { useCreateDebitCard, useUpdateDebitCard } from "@/hooks/useDebitCards";
import { DEBIT_CARD_COLORS, type DebitCard } from "@/lib/debitCards";
import { cn } from "@/lib/utils";

export function DebitCardFormDialog({
  open,
  onOpenChange,
  card,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: DebitCard | null;
  accounts: Account[];
}) {
  const createCard = useCreateDebitCard();
  const updateCard = useUpdateDebitCard();
  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.is_archived || account.id === card?.account_id),
    [accounts, card?.account_id],
  );
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [brand, setBrand] = useState("");
  const [accountId, setAccountId] = useState("");
  const [color, setColor] = useState<string>(DEBIT_CARD_COLORS[1]);

  useEffect(() => {
    if (!open) return;
    setName(card?.name ?? "");
    setInstitution(card?.institution ?? "");
    setBrand(card?.brand ?? "");
    setAccountId(card?.account_id ?? activeAccounts[0]?.id ?? "");
    setColor(card?.color ?? DEBIT_CARD_COLORS[1]);
  }, [activeAccounts, card, open]);

  const saving = createCard.isPending || updateCard.isPending;
  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Informe um nome para o cartão.");
      return;
    }
    if (!accountId) {
      toast.error("Selecione a conta vinculada.");
      return;
    }
    const values = {
      name: name.trim(),
      institution: institution.trim() || null,
      brand: brand.trim() || null,
      account_id: accountId,
      color,
    };
    try {
      if (card) await updateCard.mutateAsync({ id: card.id, ...values });
      else await createCard.mutateAsync(values);
      toast.success(card ? "Cartão de débito atualizado." : "Cartão de débito criado.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o cartão de débito.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{card ? "Editar cartão de débito" : "Novo cartão de débito"}</DialogTitle>
          <DialogDescription>
            O débito usa o saldo da conta vinculada imediatamente; não cria fatura.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="debit-card-name">Nome do cartão</Label>
            <Input
              id="debit-card-name"
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Nubank débito"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="debit-card-institution">Instituição (opcional)</Label>
              <Input
                id="debit-card-institution"
                maxLength={80}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ex.: Nubank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debit-card-brand">Bandeira (opcional)</Label>
              <Input
                id="debit-card-brand"
                maxLength={40}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex.: Mastercard"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="debit-card-account">Conta vinculada</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="debit-card-account" className="min-h-11">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
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
              {DEBIT_CARD_COLORS.map((item) => (
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
            <Button type="submit" disabled={saving || activeAccounts.length === 0}>
              {saving ? "Salvando..." : card ? "Salvar alterações" : "Criar cartão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
