import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Trash2 } from "lucide-react";
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

const CONFIRMATION_TEXT = "EXCLUIR MINHA CONTA";

export function DeleteAccountSection() {
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const deleteAccount = async () => {
    if (confirmation !== CONFIRMATION_TEXT) return;
    setDeleting(true);

    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { confirmation },
      });
      if (error) throw error;

      await supabase.auth.signOut({ scope: "local" });
      toast.success("Sua conta e seus dados foram excluídos.");
      navigate({ to: "/login", replace: true });
    } catch {
      toast.error("Não foi possível excluir sua conta. Tente novamente.");
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-xl border border-destructive/35 bg-destructive/5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-destructive">Excluir conta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Remove definitivamente seu perfil, movimentações, cartões, metas, dívidas e demais dados. Esta ação não pode ser desfeita.
          </p>
          <AlertDialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setConfirmation(""); }}>
            <AlertDialogTrigger asChild>
              <Button className="mt-4" variant="destructive">
                <Trash2 aria-hidden="true" />
                Excluir minha conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir sua conta definitivamente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Antes de continuar, faça um backup em “Exportar dados”. Para confirmar, digite exatamente <strong>{CONFIRMATION_TEXT}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-account-confirmation">Confirmação</Label>
                <Input
                  id="delete-account-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={CONFIRMATION_TEXT}
                  autoComplete="off"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    void deleteAccount();
                  }}
                  disabled={confirmation !== CONFIRMATION_TEXT || deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Excluindo..." : "Excluir definitivamente"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  );
}
