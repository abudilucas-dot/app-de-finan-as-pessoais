import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, PartyPopper, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brand } from "@/config/brand";
import { useAuth } from "@/hooks/useAuth";
import { useCreateAccount } from "@/hooks/useAccounts";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { ACCOUNT_COLORS, ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/accounts";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: `Primeiros passos — ${brand.name}` },
      { name: "description", content: "Configure seu perfil, sua renda e sua primeira conta em menos de 2 minutos." },
      { property: "og:title", content: `Primeiros passos — ${brand.name}` },
      { property: "og:description", content: "Configure sua conta em menos de 2 minutos." },
    ],
  }),
  component: OnboardingPage,
});

const OBJECTIVES = [
  "Controlar meus gastos",
  "Economizar",
  "Criar uma reserva",
  "Sair das dívidas",
  "Organizar meu salário",
  "Comprar algo",
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const createAccount = useCreateAccount();

  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState<string | null>(null);
  const [income, setIncome] = useState("");
  const [payday, setPayday] = useState("");
  const [accountName, setAccountName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState<string>(ACCOUNT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile?.onboarding_completed) navigate({ to: "/dashboard", replace: true });
  }, [profile, navigate]);

  useEffect(() => {
    if (profile?.financial_objective) setObjective(profile.financial_objective);
  }, [profile?.financial_objective]);

  if (loading || profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState />
      </main>
    );
  }

  const saveObjective = async () => {
    if (!objective) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ financial_objective: objective });
      setStep(2);
    } catch {
      toast.error("Não foi possível salvar seu objetivo.");
    } finally {
      setSaving(false);
    }
  };

  const saveIncome = async (skip = false) => {
    if (skip) {
      setStep(3);
      return;
    }
    const paydayNumber = payday ? Number(payday) : null;
    if (paydayNumber !== null && (paydayNumber < 1 || paydayNumber > 31)) {
      toast.error("O dia de recebimento deve estar entre 1 e 31.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        monthly_income: income ? parseMoneyInput(income) : null,
        payday: paydayNumber,
      });
      setStep(3);
    } catch {
      toast.error("Não foi possível salvar sua renda.");
    } finally {
      setSaving(false);
    }
  };

  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountName.trim()) {
      toast.error("Dê um nome para sua conta.");
      return;
    }
    setSaving(true);
    try {
      await createAccount.mutateAsync({
        name: accountName.trim(),
        institution: institution.trim() || null,
        type: accountType,
        initial_balance: parseMoneyInput(balance),
        color,
      });
      setStep(4);
    } catch {
      toast.error("Não foi possível criar sua conta.");
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ onboarding_completed: true });
      navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Não foi possível concluir. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        {step > 0 && step < 4 ? (
          <div className="mb-6 space-y-3">
            <button
              type="button"
              onClick={() => setStep((current) => current - 1)}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar
            </button>
            <div className="flex gap-1.5" role="presentation">
              {[1, 2, 3].map((item) => (
                <span
                  key={item}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    item <= step ? "bg-primary" : "bg-border",
                  )}
                />
              ))}
            </div>
          </div>
        ) : null}

        <section className="surface p-6 sm:p-8">
          {step === 0 ? (
            <div className="space-y-6 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Vamos organizar suas finanças.
                </h1>
                <p className="text-sm text-muted-foreground">Leva menos de 2 minutos.</p>
              </div>
              <Button className="min-h-11 w-full" onClick={() => setStep(1)}>
                Começar
              </Button>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <h1 className="text-xl font-semibold tracking-tight">Qual seu principal objetivo?</h1>
              <div role="radiogroup" aria-label="Objetivo principal" className="grid gap-2">
                {OBJECTIVES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={objective === item}
                    onClick={() => setObjective(item)}
                    className={cn(
                      "flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-sm font-medium transition-colors",
                      objective === item
                        ? "border-primary bg-accent text-accent-foreground"
                        : "hover:bg-muted/60",
                    )}
                  >
                    {item}
                    {objective === item ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                  </button>
                ))}
              </div>
              <Button className="min-h-11 w-full" disabled={!objective || saving} onClick={saveObjective}>
                {saving ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <h1 className="text-xl font-semibold tracking-tight">
                Qual sua renda mensal aproximada?
              </h1>
              <div className="space-y-2">
                <Label htmlFor="income">Renda mensal</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="income"
                    inputMode="numeric"
                    className="pl-10"
                    value={income}
                    onChange={(e) => setIncome(maskMoneyInput(e.target.value))}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payday">Dia do recebimento (opcional)</Label>
                <Input
                  id="payday"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  type="number"
                  value={payday}
                  onChange={(e) => setPayday(e.target.value)}
                  placeholder="Ex.: 5"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button className="min-h-11 flex-1" disabled={saving} onClick={() => saveIncome()}>
                  {saving ? "Salvando..." : "Continuar"}
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-11 flex-1"
                  disabled={saving}
                  onClick={() => saveIncome(true)}
                >
                  Pular
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <form className="space-y-5" onSubmit={saveAccount}>
              <h1 className="text-xl font-semibold tracking-tight">Crie sua primeira conta</h1>

              <div className="space-y-2">
                <Label htmlFor="accountName">Nome da conta</Label>
                <Input
                  id="accountName"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Ex.: Conta principal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Instituição (opcional)</Label>
                <Input
                  id="institution"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Ex.: Banco do Brasil"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountType">Tipo</Label>
                <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
                  <SelectTrigger id="accountType" className="min-h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ACCOUNT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">Saldo atual</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="balance"
                    inputMode="numeric"
                    className="pl-10"
                    value={balance}
                    onChange={(e) => setBalance(maskMoneyInput(e.target.value))}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Cor (opcional)</legend>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_COLORS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-label={`Cor ${item}`}
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

              <Button type="submit" className="min-h-11 w-full" disabled={saving}>
                {saving ? "Criando..." : "Criar conta"}
              </Button>
            </form>
          ) : null}

          {step === 4 ? (
            <div className="space-y-6 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <PartyPopper className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Tudo pronto 🎉</h1>
                <p className="text-sm text-muted-foreground">
                  Agora você pode começar a organizar suas finanças.
                </p>
              </div>
              <Button className="min-h-11 w-full" disabled={saving} onClick={finish}>
                {saving ? "Abrindo..." : "Ir para meu dashboard"}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
