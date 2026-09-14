import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: `Recuperar senha — ${brand.name}` },
      { name: "description", content: `Receba um link por e-mail para redefinir a senha da sua conta ${brand.name}.` },
      { property: "og:title", content: `Recuperar senha — ${brand.name}` },
      { property: "og:description", content: "Redefina a senha da sua conta em poucos passos." },
    ],
  }),
  component: RecoverPage,
});

function RecoverPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Não foi possível enviar o e-mail. Tente novamente.");
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      title="Recuperar senha"
      description="Enviaremos um link para você criar uma nova senha."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-muted-foreground" role="status">
          Se existir uma conta com <strong className="text-foreground">{email}</strong>, o link de
          recuperação já está a caminho. Confira também a caixa de spam.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </div>
          <Button type="submit" className="min-h-11 w-full" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
