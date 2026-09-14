import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, LogOut, UserRound } from "lucide-react";
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
