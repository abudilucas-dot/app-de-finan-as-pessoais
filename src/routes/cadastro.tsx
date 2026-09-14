import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/config/brand";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: `Criar conta — ${brand.name}` },
      { name: "description", content: `Crie sua conta ${brand.name} e comece a organizar suas finanças em minutos.` },
      { property: "og:title", content: `Criar conta — ${brand.name}` },
      { property: "og:description", content: `Crie sua conta ${brand.name} gratuitamente.` },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/onboarding", replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
        data: { full_name: fullName.trim() },
      },
    });
    setSubmitting(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("registered")
          ? "Este e-mail já possui uma conta."
          : "Não foi possível criar sua conta. Tente novamente.",
      );
      return;
    }

    if (!data.session) {
      setEmailSent(true);
      return;
    }

    toast.success("Conta criada!");
    navigate({ to: "/onboarding", replace: true });
  };

  if (emailSent) {
    return (
      <AuthShell
        title="Confirme seu e-mail"
        description={`Enviamos um link de confirmação para ${email}. Abra o link para ativar sua conta. Em seguida, você será direcionado para o login.`}
        footer={
          <Link to="/login" className="font-medium text-primary hover:underline">
            Voltar para o login
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Não encontrou o e-mail? Verifique a caixa de spam ou tente novamente em alguns minutos.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar conta"
      description="Leva menos de um minuto para começar."
      footer={
        <>
          Já tem uma conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome completo</Label>
          <Input
            id="fullName"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome"
          />
        </div>

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
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 6 caracteres"
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            Use pelo menos 6 caracteres.
          </p>
        </div>

        <Button type="submit" className="min-h-11 w-full" disabled={submitting}>
          {submitting ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </AuthShell>
  );
}
