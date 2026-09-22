import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/app/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailConfirmationRedirectUrl } from "@/config/authRedirect";
import { legalDocuments } from "@/config/legal";
import { brand } from "@/config/brand";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const RESEND_COOLDOWN_SECONDS = 120;

function resendCooldownKey(email: string) {
  return `signup-confirmation-cooldown:${email.trim().toLowerCase()}`;
}

function readResendWait(email: string) {
  const expiresAt = Number(window.sessionStorage.getItem(resendCooldownKey(email)) ?? 0);
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

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
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [resendWaitSeconds, setResendWaitSeconds] = useState(0);
  const [signupInProgress, setSignupInProgress] = useState(false);

  const startResendCooldown = (targetEmail: string) => {
    const expiresAt = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    window.sessionStorage.setItem(resendCooldownKey(targetEmail), String(expiresAt));
    setResendWaitSeconds(RESEND_COOLDOWN_SECONDS);
  };

  useEffect(() => {
    if (emailSent) setResendWaitSeconds(readResendWait(email));
  }, [emailSent, email]);

  useEffect(() => {
    if (resendWaitSeconds <= 0) return;

    const timeoutId = window.setTimeout(() => {
      setResendWaitSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [resendWaitSeconds]);

  useEffect(() => {
    if (!signupInProgress && !loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate, signupInProgress]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (!acceptedLegal) {
      toast.error("Leia e aceite os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setSubmitting(true);
    setSignupInProgress(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: emailConfirmationRedirectUrl(),
        data: {
          full_name: fullName.trim(),
          terms_version: legalDocuments.terms.version,
          privacy_version: legalDocuments.privacy.version,
        },
      },
    });

    if (error) {
      setSubmitting(false);
      setSignupInProgress(false);

      const message = error.message.toLowerCase();
      toast.error(
        message.includes("redirect")
          ? "Abra o endereço oficial do aplicativo e tente novamente."
          : message.includes("rate limit") || message.includes("email rate limit")
            ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
            : message.includes("already") || message.includes("registered")
            ? "Se este e-mail já tiver uma conta, tente entrar ou aguarde antes de reenviar a confirmação."
            : "Não foi possível criar sua conta. Tente novamente.",
      );
      return;
    }

    // Se a confirmação de e-mail estiver ativada, data.session será nula. Caso
    // contrário, encerramos qualquer sessão local para nunca levar alguém direto
    // ao dashboard após um cadastro.
    if (data.session) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });

      if (signOutError) {
        setSubmitting(false);
        setSignupInProgress(false);
        toast.error("Não foi possível concluir o cadastro com segurança. Tente novamente.");
        return;
      }
    }

    setSubmitting(false);
    setSignupInProgress(false);
    setEmailSent(true);
    startResendCooldown(email);
  };

  const handleResendConfirmation = async () => {
    if (resendWaitSeconds > 0) return;

    setResendingConfirmation(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: emailConfirmationRedirectUrl() },
    });
    setResendingConfirmation(false);

    if (error) {
      const message = error.message.toLowerCase();
      toast.error(
        message.includes("rate limit") || message.includes("email rate limit")
          ? "O reenvio está temporariamente limitado. Aguarde alguns minutos."
          : "Não foi possível reenviar agora. Tente novamente em alguns minutos.",
      );
      return;
    }

    startResendCooldown(email);
    toast.success("Se sua conta ainda precisar de confirmação, enviamos um novo link.");
  };

  if (emailSent) {
    return (
      <AuthShell
        title="Confirme seu e-mail"
        description={`Enviamos um link para ${email}. Depois da confirmação, o login será aberto no mesmo endereço do aplicativo.`}
        footer={
          <Link to="/login" className="font-medium text-primary hover:underline">
            Ir para o login
          </Link>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Não encontrou a mensagem? Confira Spam e Promoções. O reenvio fica disponível após dois minutos, mesmo se a página for atualizada, para evitar bloqueios.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleResendConfirmation}
              disabled={resendingConfirmation || resendWaitSeconds > 0}
            >
              {resendingConfirmation
                ? "Reenviando..."
                : resendWaitSeconds > 0
                  ? `Reenviar em ${resendWaitSeconds}s`
                  : "Reenviar confirmação"}
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link to="/recuperar-senha">Esqueci minha senha</Link>
            </Button>
          </div>
        </div>
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
          <span className="mx-2 text-muted-foreground">·</span>
          <Link to="/privacidade" className="hover:underline">Privacidade</Link>
          <span className="mx-2 text-muted-foreground">·</span>
          <Link to="/termos" className="hover:underline">Termos</Link>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 8 caracteres"
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            Use pelo menos 8 caracteres.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm leading-5">
          <input
            type="checkbox"
            checked={acceptedLegal}
            onChange={(event) => setAcceptedLegal(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-primary"
          />
          <span>
            Li e aceito os{" "}
            <Link to="/termos" target="_blank" className="font-medium text-primary hover:underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link to="/privacidade" target="_blank" className="font-medium text-primary hover:underline">
              Política de Privacidade
            </Link>.
          </span>
        </label>

        <Button type="submit" className="min-h-11 w-full" disabled={submitting}>
          {submitting ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </AuthShell>
  );
}
