import { useEffect, useState } from "react";
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
import { type Account, useCreateAccount, useUpdateAccount } from "@/hooks/useAccounts";
import {
  ACCOUNT_COLORS,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  type AccountType,
} from "@/lib/accounts";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";

function moneyInputFromNumber(value: number) {
  return maskMoneyInput(String(Math.round(Number(value) * 100)));
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}) {
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("0,00");
  const [color, setColor] = useState<string>(ACCOUNT_COLORS[0]);

  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? "");
    setInstitution(account?.institution ?? "");
    setType(account?.type ?? "checking");
    setBalance(account ? moneyInputFromNumber(account.initial_balance) : "0,00");
    setColor(account?.color ?? ACCOUNT_COLORS[0]);
  }, [account, open]);

  const saving = createAccount.isPending || updateAccount.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Informe um nome para a conta.");
      return;
    }

    const values = {
      name: name.trim(),
      institution: institution.trim() || null,
      type,
      initial_balance: parseMoneyInput(balance),
      color,
    };

    try {
      if (account) await updateAccount.mutateAsync({ id: account.id, ...values });
      else await createAccount.mutateAsync(values);
      toast.success(account ? "Conta atualizada." : "Conta criada.");
      onOpenChange(false);
    } catch {
      toast.error(
        account ? "Não foi possível atualizar a conta." : "Não foi possível criar a conta.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{account ? "Editar conta" : "Nova conta"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Atualize os dados da sua conta."
              : "Cadastre uma conta bancária, carteira ou dinheiro em espécie."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="account-name">Nome da conta</Label>
            <Input
              id="account-name"
              required
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Conta principal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-institution">Instituição (opcional)</Label>
            <Input
              id="account-institution"
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
              placeholder="Ex.: Nubank"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-type">Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as AccountType)}>
              <SelectTrigger id="account-type" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ACCOUNT_TYPE_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-balance">Saldo inicial</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                id="account-balance"
                inputMode="numeric"
                className="pl-10"
                value={balance}
                onChange={(event) => setBalance(maskMoneyInput(event.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Nesta etapa, o saldo atual ainda é igual ao saldo inicial.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Cor da conta</legend>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map((item) => (
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
              {saving ? "Salvando..." : account ? "Salvar alterações" : "Criar conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
