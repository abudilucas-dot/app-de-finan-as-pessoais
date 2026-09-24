import { useNavigate } from "@tanstack/react-router";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const CONFIRMATION_TEXT = "RECOMEÇAR MINHA GESTÃO";

export function ResetFinancialDataSection() {
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [open, setOpen] = useState(false);

  const resetFinancialData = async () => {
    if (confirmation !== CONFIRMATION_TEXT) return;
    setResetting(true);
    try {
      const { error } = await supabase.functions.invoke("reset-financial-data", {
        body: { confirmation },
      });
      if (error) throw error;

      toast.success("Dados financeiros removidos. Vamos começar uma nova gestão.");
      navigate({ to: "/onboarding", replace: true });
    } catch {
      toast.error("Não foi possível reiniciar sua gestão agora.");
      setResetting(false);
    }
  };

  return (
    <section className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-amber-700 dark:text-amber-300">Recomeçar gestão financeira</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mantém seu acesso e preferências, mas remove permanentemente contas, cartões, movimentações, metas, orçamentos, dívidas e categorias personalizadas. Você voltará ao início do onboarding.
          </p>
          <AlertDialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setConfirmation(""); }}>
            <AlertDialogTrigger asChild>
              <Button className="mt-4 border-amber-500/50 text-amber-800 hover:bg-amber-500/15 dark:text-amber-200" variant="outline">
                <RotateCcw aria-hidden="true" />
                Recomeçar minha gestão
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Recomeçar a gestão do zero?</AlertDialogTitle>
                <AlertDialogDescription>
                  Faça um backup antes de continuar. Esta ação não exclui sua conta, mas apaga definitivamente todos os dados financeiros atuais, inclusive pagamentos de fatura já realizados. Para confirmar, digite exatamente <strong>{CONFIRMATION_TEXT}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="reset-financial-data-confirmation">Confirmação</Label>
                <Input
                  id="reset-financial-data-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={CONFIRMATION_TEXT}
                  autoComplete="off"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    void resetFinancialData();
                  }}
                  disabled={confirmation !== CONFIRMATION_TEXT || resetting}
                  className="bg-amber-600 text-white hover:bg-amber-700"
                >
                  {resetting ? "Reiniciando..." : "Apagar dados financeiros"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  );
}
