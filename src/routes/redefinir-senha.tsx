import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/config/brand";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: `Nova senha — ${brand.name}` },
      { name: "description", content: `Defina uma nova senha para sua conta ${brand.name}.` },
      { property: "og:title", content: `Nova senha — ${brand.name}` },
      { property: "og:description", content: "Defina uma nova senha com segurança." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast.error("Não foi possível alterar a senha. Peça um novo link.");
      return;
    }
    toast.success("Senha atualizada!");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <AuthShell
      title="Criar nova senha"
      description="Escolha uma senha que você não use em outros serviços."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {!loading && !user ? (
        <p className="text-sm text-muted-foreground">
          Este link expirou ou é inválido. Peça um novo em “Esqueci minha senha”.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
            />
          </div>
          <Button type="submit" className="min-h-11 w-full" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
