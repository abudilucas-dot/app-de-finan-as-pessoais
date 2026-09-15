import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/config/brand";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: `Entrar — ${brand.name}` },
      { name: "description", content: `Acesse sua conta ${brand.name} e continue organizando suas finanças.` },
      { property: "og:title", content: `Entrar — ${brand.name}` },
      { property: "og:description", content: `Acesse sua conta ${brand.name}.` },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingEmail, setConfirmingEmail] = useState(false);
  const confirmationHandled = useRef(false);

  useEffect(() => {
    const isEmailConfirmation = new URLSearchParams(window.location.search).get("confirmed") === "1";

    if (!isEmailConfirmation) {
      if (!loading && user) navigate({ to: "/dashboard", replace: true });
      return;
    }

    // O Supabase precisa terminar de processar o token do link antes de a sessão
    // ser removida. Isso impede que a confirmação vire um login automático.
    if (loading || confirmationHandled.current) {
      if (loading) setConfirmingEmail(true);
      return;
    }

    confirmationHandled.current = true;

    if (!user) {
      window.history.replaceState(window.history.state, "", "/login");
      setConfirmingEmail(false);
      toast.error("Não foi possível validar este link. Solicite uma nova confirmação.");
      return;
    }

    setConfirmingEmail(true);

    void supabase.auth
      .signOut({ scope: "local" })
      .then(({ error }) => {
        if (error) throw error;

        window.history.replaceState(window.history.state, "", "/login");
        setConfirmingEmail(false);
        toast.success("E-mail confirmado! Agora entre com sua nova conta.");
      })
      .catch(() => {
        setConfirmingEmail(false);
        toast.error("Não foi possível finalizar a confirmação. Atualize a página e tente novamente.");
      });
  }, [user, loading, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid")
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente.",
      );
      return;
    }

    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard", replace: true });
  };

  if (confirmingEmail) {
    return (
      <AuthShell
        title="Confirmando seu e-mail"
        description="Estamos validando seu acesso e preparando a tela de login."
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
          Aguarde um instante…
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Entrar"
      description="Use seu e-mail e senha para acessar sua conta."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link to="/recuperar-senha" className="text-xs font-medium text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="min-h-11 w-full" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </AuthShell>
  );
}
