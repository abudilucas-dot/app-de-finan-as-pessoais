import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Crown, Download, Eye, LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DeleteAccountSection } from "@/components/app/DeleteAccountSection";
import { SubscriptionPlans } from "@/components/app/SubscriptionPlans";
import { ResetFinancialDataSection } from "@/components/app/ResetFinancialDataSection";
import { PageHeader } from "@/components/app/PageHeader";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { brand } from "@/config/brand";
import { moduleThemes } from "@/config/moduleThemes";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useBillingSubscription } from "@/hooks/useBillingSubscription";
import { createCsvFile, localFileDate, saveCsvFile } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: `Configurações — ${brand.name}` }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();
  const billing = useBillingSubscription();
  const [fullName, setFullName] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [preparedBackup, setPreparedBackup] = useState<File | null>(null);
  const [savingBackup, setSavingBackup] = useState(false);
  const settingsTheme = moduleThemes.settings;
  const exportTheme = moduleThemes.export;
  const billingTheme = moduleThemes.cards;

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  if (profileLoading || settingsLoading)
    return <LoadingState label="Carregando configurações..." />;

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    try {
      await updateProfile.mutateAsync({ full_name: fullName.trim() });
      toast.success("Perfil atualizado.");
    } catch {
      toast.error("Não foi possível atualizar seu perfil.");
    }
  };

  const toggleValues = async (checked: boolean) => {
    try {
      await updateSettings.mutateAsync({ hide_values: checked });
      toast.success(checked ? "Valores ocultos." : "Valores visíveis.");
    } catch {
      toast.error("Não foi possível salvar essa preferência.");
    }
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [accounts, creditCards, debitCards, transactions, budgets, goals, contributions, recurrences, debts, debtPayments, categories, notificationDismissals, legalAcceptances] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", user.id),
        supabase.from("credit_cards").select("*").eq("user_id", user.id),
        supabase.from("debit_cards").select("*").eq("user_id", user.id),
        supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date"),
        supabase.from("budgets").select("*").eq("user_id", user.id),
        supabase.from("financial_goals").select("*").eq("user_id", user.id),
        supabase.from("goal_contributions").select("*").eq("user_id", user.id),
        supabase.from("recurring_rules").select("*").eq("user_id", user.id),
        supabase.from("financial_debts").select("*").eq("user_id", user.id),
        supabase.from("debt_payments").select("*").eq("user_id", user.id),
        supabase.from("categories").select("*").or(`user_id.eq.${user.id},user_id.is.null`),
        supabase.from("notification_dismissals").select("*").eq("user_id", user.id),
        supabase.from("legal_acceptances").select("*").eq("user_id", user.id).order("accepted_at"),
      ]);
      const result = [accounts, creditCards, debitCards, transactions, budgets, goals, contributions, recurrences, debts, debtPayments, categories, notificationDismissals, legalAcceptances];
      const failed = result.find((item) => item.error);
      if (failed?.error) throw failed.error;
      const rows = [
        ...(profile ? [["Perfil", profile.id, profile.full_name ?? "", profile.monthly_income ?? "", profile.payday ?? "", profile.financial_objective ?? "", profile.onboarding_completed ? "Onboarding concluído" : "Onboarding pendente", "", "", ""]] : []),
        ...(settings ? [["Preferência", settings.id, "Configurações da conta", settings.currency, settings.locale, settings.timezone ?? "", settings.theme, settings.hide_values ? "Valores ocultos" : "Valores visíveis", "", ""]] : []),
        ...(categories.data ?? []).map((item) => ["Categoria", item.id, item.name, item.type, item.icon ?? "", item.color ?? "", item.is_default ? "Padrão" : "Personalizada", item.user_id ? "Pessoal" : "Global", "", ""]),
        ...(notificationDismissals.data ?? []).map((item) => ["Notificação dispensada", item.id, item.notification_key, item.dismissed_at, "", "", "", "", "", ""]),
        ...(legalAcceptances.data ?? []).map((item) => ["Aceite legal", item.id, item.document_type, item.document_version, item.accepted_at, "", "", "", "", ""]),
        ...(accounts.data ?? []).map((item) => ["Conta", item.id, item.name, item.institution, item.type, item.initial_balance, "", "", item.is_archived, ""]),
        ...(creditCards.data ?? []).map((item) => ["Cartão de crédito", item.id, item.name, item.institution, item.brand, item.total_limit, item.closing_day, item.due_day, item.is_archived, ""]),
        ...(debitCards.data ?? []).map((item) => ["Cartão de débito", item.id, item.name, item.institution, item.brand, "", item.account_id, "", item.is_archived, ""]),
        ...(transactions.data ?? []).map((item) => ["Movimentação", item.id, item.description, item.type, item.status, item.amount, item.transaction_date, item.deleted_at ? "Na lixeira" : "Ativa", item.account_id ?? "", item.notes ?? ""]),
        ...(budgets.data ?? []).map((item) => ["Orçamento", item.id, item.category_id, item.period_start, "", item.amount_limit, "", "", "", ""]),
        ...(goals.data ?? []).map((item) => ["Meta", item.id, item.name, item.status, item.target_date ?? "", item.target_amount, "", "", "", ""]),
        ...(contributions.data ?? []).map((item) => ["Aporte de meta", item.id, item.goal_id, item.contribution_date, "", item.amount, item.account_id ?? "", "", "", item.notes ?? ""]),
        ...(recurrences.data ?? []).map((item) => [item.is_subscription ? "Assinatura" : "Recorrência", item.id, item.description, item.type, item.frequency, item.amount, item.next_occurrence, item.active ? "Ativa" : "Inativa", item.account_id, item.notes ?? ""]),
        ...(debts.data ?? []).map((item) => ["Dívida", item.id, item.name, item.institution ?? "", item.status, item.remaining_amount, item.next_due_date ?? "", item.total_installments ? `${item.total_installments} parcelas` : "", item.interest_rate ?? "", item.notes ?? ""]),
        ...(debtPayments.data ?? []).map((item) => ["Pagamento de dívida", item.id, item.debt_id, item.payment_date, "", item.amount, item.account_id, "", item.transaction_id, item.notes ?? ""]),
      ];
      const filename = `financas-${localFileDate()}.html`;
      setPreparedBackup(
        createCsvFile(filename, ["Tipo de registro", "ID", "Descrição / nome", "Detalhe 1", "Detalhe 2", "Valor", "Data / referência", "Situação", "Vínculo", "Observações"], rows),
      );
      toast.success("Backup preparado. Agora escolha onde salvar.");
    } catch {
      toast.error("Não foi possível exportar seus dados.");
    } finally {
      setExporting(false);
    }
  };

  const savePreparedBackup = async () => {
    if (!preparedBackup) return;
    setSavingBackup(true);
    try {
      const result = await saveCsvFile(preparedBackup);
      if (result === "shared") {
        toast.success("Escolha “Salvar em Arquivos” para definir a pasta do backup.");
      } else {
        toast.success(`Backup baixado: ${preparedBackup.name}. Procure-o em Downloads.`);
      }
      setPreparedBackup(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast("Salvamento cancelado.");
      } else {
        toast.error("Não foi possível salvar o backup.");
      }
    } finally {
      setSavingBackup(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate({ to: "/login", replace: true });
    } catch {
      toast.error("Não foi possível sair. Tente novamente.");
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Configurações" description="Gerencie seu perfil e suas preferências." />

      <section className={`surface border p-5 sm:p-6 ${settingsTheme.card}`}>
        <div className="mb-5 flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${settingsTheme.icon}`}>
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">Perfil</h2>
            <p className="text-sm text-muted-foreground">Dados básicos da sua conta.</p>
          </div>
        </div>

        <form className="grid gap-4 sm:max-w-xl" onSubmit={saveProfile}>
          <div className="space-y-2">
            <Label htmlFor="full-name">Nome completo</Label>
            <Input
              id="full-name"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-email">E-mail</Label>
            <Input id="account-email" value={user?.email ?? ""} readOnly disabled />
          </div>
          <div>
            <Button className={settingsTheme.primary} type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>
        </form>
      </section>

      <section className={`surface divide-y border ${settingsTheme.card}`}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold">Tema</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha entre claro, escuro ou o padrão do sistema.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <Eye className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <Label htmlFor="hide-values" className="text-base font-semibold">
                Ocultar valores
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Esconde valores monetários em todas as telas.
              </p>
            </div>
          </div>
          <Switch
            id="hide-values"
            checked={settings?.hide_values ?? false}
            disabled={!settings || updateSettings.isPending}
            onCheckedChange={toggleValues}
            aria-label="Ocultar valores monetários"
          />
        </div>
      </section>

      <section className={`surface border p-5 sm:p-6 ${billingTheme.card}`}>
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${billingTheme.icon}`}>
            <Crown className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className={`font-semibold ${billingTheme.text}`}>Seu acesso Valune</h2>
            {billing.isLoading ? (
              <p className="mt-1 text-sm text-muted-foreground">Verificando seu plano...</p>
            ) : billing.data?.status === "beta" ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">Acesso beta liberado enquanto concluímos a abertura pública.</p>
                <p className="mt-3 text-sm font-medium text-fuchsia-700 dark:text-fuchsia-300">Você continuará usando todos os recursos durante o beta.</p>
              </>
            ) : billing.data?.status === "trialing" ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">Você está no teste grátis do Valune.</p>
                <p className="mt-3 text-sm font-medium text-fuchsia-700 dark:text-fuchsia-300">
                  Restam {Math.max(0, Math.ceil((new Date(billing.data.trial_ends_at).getTime() - Date.now()) / 86_400_000))} dias do seu teste.
                </p>
              </>
            ) : billing.data?.status === "active" ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Seu acesso completo ao Valune está desbloqueado.
                </p>
                <p className="mt-3 text-sm font-medium text-fuchsia-700 dark:text-fuchsia-300">
                  Todos os recursos estão liberados para você.
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Seu acesso será liberado após a confirmação segura da compra.</p>
            )}
          </div>
        </div>
        <SubscriptionPlans subscription={billing.data ?? null} />
      </section>

      <section className={`surface border p-5 sm:p-6 ${exportTheme.card}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${exportTheme.icon}`}><Download className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h2 className="font-semibold">Exportar dados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Baixe um relatório visual e organizado das suas contas, cartões, movimentações, metas, dívidas, orçamentos, recorrências e preferências.
            </p>
            {preparedBackup ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Relatório pronto: {preparedBackup.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Toque para abrir as opções do seu dispositivo e escolha “Salvar em Arquivos”.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button className={exportTheme.primary} onClick={savePreparedBackup} disabled={savingBackup}>
                    <Download aria-hidden="true" />
                    {savingBackup ? "Abrindo opções..." : "Salvar em Arquivos ou compartilhar"}
                  </Button>
                  <Button variant="ghost" onClick={() => setPreparedBackup(null)} disabled={savingBackup}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button className={`mt-4 border-teal-500/45 ${exportTheme.text} hover:bg-teal-500/15`} variant="outline" onClick={exportData} disabled={exporting}>
                <Download aria-hidden="true" />
                {exporting ? "Preparando arquivo..." : "Preparar relatório financeiro"}
              </Button>
            )}
          </div>
        </div>
      </section>

      <ResetFinancialDataSection />

      <DeleteAccountSection />

      <section className={`surface border p-5 sm:p-6 ${settingsTheme.card}`}>
        <h2 className={`font-semibold ${settingsTheme.text}`}>Sessão</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Encerre o acesso da sua conta neste dispositivo.
        </p>
        <Button className="mt-4" variant="outline" onClick={handleLogout} disabled={loggingOut}>
          <LogOut aria-hidden="true" />
          {loggingOut ? "Saindo..." : "Sair da conta"}
        </Button>
      </section>
    </div>
  );
}
