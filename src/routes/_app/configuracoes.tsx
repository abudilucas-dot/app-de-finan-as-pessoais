import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, Eye, LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { brand } from "@/config/brand";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { localFileDate, saveCsvFile } from "@/lib/csvExport";
import type { ExportSheet } from "@/lib/excelExport";
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
  const [fullName, setFullName] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [preparedBackup, setPreparedBackup] = useState<File | null>(null);
  const [savingBackup, setSavingBackup] = useState(false);

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
      toast.e  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [accounts, creditCards, debitCards, transactions, budgets, goals, contributions, recurrences, categories] =
        await Promise.all([
          supabase.from("accounts").select("*").eq("user_id", user.id),
          supabase.from("credit_cards").select("*").eq("user_id", user.id),
          supabase.from("debit_cards").select("*").eq("user_id", user.id),
          supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date"),
          supabase.from("budgets").select("*").eq("user_id", user.id),
          supabase.from("financial_goals").select("*").eq("user_id", user.id),
          supabase.from("goal_contributions").select("*").eq("user_id", user.id),
          supabase.from("recurring_rules").select("*").eq("user_id", user.id),
          supabase.from("categories").select("id, name"),
        ]);
      const result = [accounts, creditCards, debitCards, transactions, budgets, goals, contributions, recurrences, categories];
      const failed = result.find((item) => item.error);
      if (failed?.error) throw failed.error;

      const accountNames = new Map((accounts.data ?? []).map((item) => [item.id, item.name]));
      const creditCardNames = new Map((creditCards.data ?? []).map((item) => [item.id, item.name]));
      const categoryNames = new Map((categories.data ?? []).map((item) => [item.id, item.name]));
      const goalNames = new Map((goals.data ?? []).map((item) => [item.id, item.name]));
      const typeLabels: Record<string, string> = {
        income: "Receita",
        expense: "Despesa",
        transfer: "Transferência",
        card_payment: "Pagamento de fatura",
      };
      const statusLabels: Record<string, string> = {
        confirmed: "Confirmada",
        pending: "Pendente",
        overdue: "Em atraso",
        cancelled: "Cancelada",
      };
      const accountTypeLabels: Record<string, string> = {
        checking: "Conta corrente",
        savings: "Poupança",
        cash: "Dinheiro",
        digital_wallet: "Carteira digital",
        investment: "Investimentos",
        other: "Outra",
      };

      const activeTransactions = (transactions.data ?? []).filter((item) => !item.deleted_at);
      const totalIncome = activeTransactions
        .filter((item) => item.type === "income" && item.status === "confirmed")
        .reduce((total, item) => total + Number(item.amount ?? 0), 0);
      const totalExpenses = activeTransactions
        .filter((item) => item.type === "expense" && item.status === "confirmed")
        .reduce((total, item) => total + Number(item.amount ?? 0), 0);

      const sheets: ExportSheet[] = [
        {
          name: "Movimentações",
          columns: [
            { header: "Descrição", key: "description", width: 30 },
            { header: "Tipo", key: "type", width: 22 },
            { header: "Categoria", key: "category", width: 22 },
            { header: "Valor", key: "amount", width: 16, format: "currency" },
            { header: "Data", key: "date", width: 14, format: "date" },
            { header: "Status", key: "status", width: 16 },
            { header: "Conta", key: "account", width: 22 },
            { header: "Cartão", key: "card", width: 22 },
            { header: "Observações", key: "notes", width: 32 },
            { header: "Situação", key: "situation", width: 16 },
          ],
          rows: (transactions.data ?? []).map((item) => ({
            description: item.description,
            type: typeLabels[item.type] ?? item.type,
            category: categoryNames.get(item.category_id ?? "") ?? "Sem categoria",
            amount: Number(item.amount ?? 0),
            date: item.transaction_date ? new Date(`${item.transaction_date}T12:00:00`) : "",
            status: statusLabels[item.status] ?? item.status,
            account: accountNames.get(item.account_id ?? "") ?? "—",
            card: creditCardNames.get(item.credit_card_id ?? "") ?? "—",
            notes: item.notes ?? "",
            situation: item.deleted_at ? "Na lixeira" : "Ativa",
          })),
        },
        {
          name: "Contas",
          columns: [
            { header: "Nome", key: "name", width: 26 },
            { header: "Instituição", key: "institution", width: 24 },
            { header: "Tipo", key: "type", width: 22 },
            { header: "Saldo inicial", key: "balance", width: 18, format: "currency" },
            { header: "Arquivada", key: "archived", width: 14 },
          ],
          rows: (accounts.data ?? []).map((item) => ({
            name: item.name,
            institution: item.institution ?? "—",
            type: accountTypeLabels[item.type] ?? item.type,
            balance: Number(item.initial_balance ?? 0),
            archived: item.is_archived ? "Sim" : "Não",
          })),
        },
        {
          name: "Cartões",
          columns: [
            { header: "Tipo", key: "type", width: 20 },
            { header: "Nome", key: "name", width: 26 },
            { header: "Instituição", key: "institution", width: 24 },
            { header: "Bandeira", key: "brand", width: 16 },
            { header: "Limite", key: "limit", width: 16, format: "currency" },
            { header: "Fechamento", key: "closing", width: 14 },
            { header: "Vencimento", key: "due", width: 14 },
            { header: "Conta vinculada", key: "account", width: 24 },
            { header: "Arquivado", key: "archived", width: 14 },
          ],
          rows: [
            ...(creditCards.data ?? []).map((item) => ({
              type: "Crédito",
              name: item.name,
              institution: item.institution ?? "—",
              brand: item.brand ?? "—",
              limit: Number(item.total_limit ?? 0),
              closing: item.closing_day ?? "—",
              due: item.due_day ?? "—",
              account: accountNames.get(item.default_payment_account_id ?? "") ?? "—",
              archived: item.is_archived ? "Sim" : "Não",
            })),
            ...(debitCards.data ?? []).map((item) => ({
              type: "Débito",
              name: item.name,
              institution: item.institution ?? "—",
              brand: item.brand ?? "—",
              limit: "",
              closing: "—",
              due: "—",
              account: accountNames.get(item.account_id ?? "") ?? "—",
              archived: item.is_archived ? "Sim" : "Não",
            })),
          ],
        },
        {
          name: "Orçamentos",
          columns: [
            { header: "Categoria", key: "category", width: 26 },
            { header: "Início do período", key: "period", width: 18, format: "date" },
            { header: "Limite", key: "limit", width: 18, format: "currency" },
          ],
          rows: (budgets.data ?? []).map((item) => ({
            category: categoryNames.get(item.category_id) ?? "Sem categoria",
            period: item.period_start ? new Date(`${item.period_start}T12:00:00`) : "",
            limit: Number(item.amount_limit ?? 0),
          })),
        },
        {
          name: "Metas",
          columns: [
            { header: "Meta", key: "name", width: 30 },
            { header: "Valor desejado", key: "target", width: 20, format: "currency" },
            { header: "Data alvo", key: "date", width: 16, format: "date" },
            { header: "Status", key: "status", width: 16 },
          ],
          rows: (goals.data ?? []).map((item) => ({
            name: item.name,
            target: Number(item.target_amount ?? 0),
            date: item.target_date ? new Date(`${item.target_date}T12:00:00`) : "",
            status: item.status === "active" ? "Ativa" : item.status,
          })),
        },
        {
          name: "Aportes",
          columns: [
            { header: "Meta", key: "goal", width: 30 },
            { header: "Valor", key: "amount", width: 18, format: "currency" },
            { header: "Data", key: "date", width: 16, format: "date" },
            { header: "Conta", key: "account", width: 24 },
            { header: "Observações", key: "notes", width: 32 },
          ],
          rows: (contributions.data ?? []).map((item) => ({
            goal: goalNames.get(item.goal_id) ?? "Meta removida",
            amount: Number(item.amount ?? 0),
            date: item.contribution_date ? new Date(`${item.contribution_date}T12:00:00`) : "",
            account: accountNames.get(item.account_id ?? "") ?? "—",
            notes: item.notes ?? "",
          })),
        },
        {
          name: "Recorrências",
          columns: [
            { header: "Descrição", key: "description", width: 30 },
            { header: "Tipo", key: "type", width: 18 },
            { header: "Frequência", key: "frequency", width: 18 },
            { header: "Valor", key: "amount", width: 18, format: "currency" },
            { header: "Próxima ocorrência", key: "date", width: 20, format: "date" },
            { header: "Conta", key: "account", width: 24 },
            { header: "Ativa", key: "active", width: 14 },
          ],
          rows: (recurrences.data ?? []).map((item) => ({
            description: item.description,
            type: typeLabels[item.type] ?? item.type,
            frequency: item.frequency,
            amount: Number(item.amount ?? 0),
            date: item.next_occurrence ? new Date(`${item.next_occurrence}T12:00:00`) : "",
            account: accountNames.get(item.account_id ?? "") ?? "—",
            active: item.active ? "Sim" : "Não",
          })),
        },
      ];

      const { createFinanceExcelFile } = await import("@/lib/excelExport");
      const filename = `financas-${localFileDate()}.xlsx`;
      setPreparedBackup(
        await createFinanceExcelFile(filename, [
          ["Contas cadastradas", accounts.data?.length ?? 0],
          ["Cartões cadastrados", (creditCards.data?.length ?? 0) + (debitCards.data?.length ?? 0)],
          ["Movimentações ativas", activeTransactions.length],
          ["Receitas confirmadas", totalIncome],
          ["Despesas confirmadas", totalExpenses],
          ["Metas cadastradas", goals.data?.length ?? 0],
        ], sheets),
      );
      toast.success("Planilha preparada. Agora escolha onde salvar.");
    } catch {
      toast.error("Não foi possível preparar sua planilha.");
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

      <section className="surface p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
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
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>
        </form>
      </section>

      <section className="surface divide-y">
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

      <section className="surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Exportar dados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Baixe uma planilha Excel organizada, com abas separadas para cada área das suas finanças.
            </p>
            {preparedBackup ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Planilha pronta: {preparedBackup.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Toque para abrir as opções do seu dispositivo e escolha “Salvar em Arquivos”.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={savePreparedBackup} disabled={savingBackup}>
                    <Download aria-hidden="true" />
                    {savingBackup ? "Abrindo opções..." : "Salvar em Arquivos ou compartilhar"}
                  </Button>
                  <Button variant="ghost" onClick={() => setPreparedBackup(null)} disabled={savingBackup}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button className="mt-4" variant="outline" onClick={exportData} disabled={exporting}>
                <Download aria-hidden="true" />
                {exporting ? "Preparando arquivo..." : "Preparar planilha Excel"}
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="surface p-5 sm:p-6">
        <h2 className="font-semibold">Sessão</h2>
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
