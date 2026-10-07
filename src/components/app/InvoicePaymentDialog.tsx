import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
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
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/hooks/useAccounts";
import { usePayCreditCardInvoice } from "@/hooks/useCreditCards";
import type { CreditCard, CreditCardInvoice } from "@/lib/creditCards";
import { localToday } from "@/lib/transactions";

export function InvoicePaymentDialog({
  open,
  onOpenChange,
  invoice,
  card,
  amount,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: CreditCardInvoice | null;
  card?: CreditCard | null;
  amount: number;
  accounts: Account[];
}) {
  const payInvoice = usePayCreditCardInvoice();
  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.is_archived),
    [accounts],
  );
  const [accountId, setAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(localToday());
  useEffect(() => {
    if (open) {
      setAccountId(card?.default_payment_account_id ?? activeAccounts[0]?.id ?? "");
      setPaymentDate(localToday());
    }
  }, [activeAccounts, card?.default_payment_account_id, open]);
  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!invoice) return;
    if (!accountId) {
      toast.error("Selecione a conta que fará o pagamento.");
      return;
    }
    try {
      await payInvoice.mutateAsync({ invoiceId: invoice.id, accountId, paymentDate });
      toast.success("Fatura paga. A despesa não foi contabilizada novamente.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível pagar a fatura.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar fatura</DialogTitle>
          <DialogDescription>
            O pagamento reduz o saldo da conta e quita a fatura, sem duplicar sua despesa mensal.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="text-sm text-muted-foreground">Valor a pagar</p>
            <MoneyDisplay value={amount} className="mt-1 block text-2xl font-semibold" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-payment-account">Pagar com</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="invoice-payment-account" className="min-h-11">
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
          <div className="space-y-2">
            <Label htmlFor="invoice-payment-date">Data do pagamento</Label>
            <DateInput
              id="invoice-payment-date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={payInvoice.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                payInvoice.isPending || !invoice || amount <= 0 || activeAccounts.length === 0
              }
            >
              {payInvoice.isPending ? "Pagando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
