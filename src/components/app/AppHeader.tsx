import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Eye, EyeOff, Menu, Plus, Search } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { brand } from "@/config/brand";
import { primaryNav } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { requestNewTransaction } from "@/lib/newTransaction";
import { cn } from "@/lib/utils";

const appSearchItems = [
  { title: "Visão geral", description: "Resumo da sua vida financeira", to: "/dashboard", terms: "inicio painel saldo resumo" },
  { title: "Transações", description: "Receitas, despesas e transferências", to: "/transacoes", terms: "movimentacoes lancamentos gastos entradas" },
  { title: "Contas", description: "Bancos, carteiras e saldos", to: "/contas", terms: "banco carteira saldo" },
  { title: "Cartões", description: "Cartões, faturas e parcelas", to: "/cartoes", terms: "cartao credito debito fatura parcela" },
  { title: "Orçamentos", description: "Limites por categoria", to: "/orcamentos", terms: "orcamento limite planejamento" },
  { title: "Metas", description: "Objetivos e aportes", to: "/metas", terms: "meta objetivo guardar dinheiro aporte" },
  { title: "Dívidas", description: "Acompanhe o que falta quitar", to: "/dividas", terms: "divida emprestimo financiamento" },
  { title: "Assinaturas", description: "Serviços recorrentes", to: "/assinaturas", terms: "recorrencia recorrente mensal" },
  { title: "Calendário", description: "Compromissos financeiros por dia", to: "/calendario", terms: "agenda vencimento data" },
  { title: "Relatórios", description: "Análises da sua vida financeira", to: "/relatorios", terms: "grafico analise dados" },
  { title: "Configurações", description: "Perfil, aparência e privacidade", to: "/configuracoes", terms: "perfil tema exportar dados" },
] as const;

function SearchResults({ query, onNavigate, mobile = false }: { query: string; onNavigate: () => void; mobile?: boolean }) {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedQuery) return null;

  const results = appSearchItems.filter((item) =>
    `${item.title} ${item.description} ${item.terms}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery),
  );

  return (
    <div className={cn(
      "z-50 overflow-hidden rounded-xl border bg-popover shadow-float",
      mobile ? "mt-3" : "absolute left-0 top-full mt-2 w-full",
    )}>
      {results.length ? (
        <div className="p-1.5">
          {results.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-accent"
            >
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-3 py-4 text-sm text-muted-foreground">Nenhuma área encontrada.</p>
      )}
    </div>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return brand.initials;
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

export function AppHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const { notifications, isLoading: notificationsLoading } = useNotifications();
  const updateSettings = useUpdateSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const hidden = settings?.hide_values ?? false;
  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Você";
  const notificationCount = notifications.length;
  const notificationLabel = notificationsLoading
    ? "Carregando notificações"
    : notificationCount > 0
      ? `${notificationCount} ${notificationCount === 1 ? "notificação pendente" : "notificações pendentes"}`
      : "Notificações";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-5 py-4">
            <SheetTitle className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                {brand.initials}
              </span>
              {brand.name}
            </SheetTitle>
          </SheetHeader>
          <nav aria-label="Navegação" className="space-y-1 px-3 pb-6">
            {primaryNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  pathname === item.to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="relative hidden min-w-0 max-w-sm flex-1 md:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSearchQuery("");
          }}
          placeholder="Pesquisar no Valune"
          aria-label="Pesquisar"
          className="pl-9"
        />
        <SearchResults query={searchQuery} onNavigate={() => setSearchQuery("")} />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button asChild className="hidden md:inline-flex">
          <Link to="/transacoes" onClick={requestNewTransaction}>
            <Plus aria-hidden="true" />
            Nova transação
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Pesquisar no Valune"
          onClick={() => setMobileSearchOpen(true)}
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
          aria-pressed={hidden}
          disabled={!settings || updateSettings.isPending}
          onClick={() => updateSettings.mutate({ hide_values: !hidden })}
        >
          {hidden ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>

        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={notificationLabel}
        >
          <Link to="/notificacoes">
            <Bell className="h-5 w-5" aria-hidden="true" />
            {notificationCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            ) : null}
          </Link>
        </Button>

        <Link
          to="/configuracoes"
          className="flex min-h-11 items-center gap-2 rounded-full px-1 py-1 transition-colors hover:bg-accent/60"
          aria-label="Abrir configurações da conta"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initialsOf(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate pr-2 text-sm font-medium sm:inline">
            {displayName}
          </span>
        </Link>
      </div>

      <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md translate-y-0 overflow-y-auto sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle>Pesquisar no Valune</DialogTitle>
            <DialogDescription>Encontre rapidamente uma área do aplicativo.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Ex.: cartões, metas ou relatórios"
              aria-label="Pesquisar no Valune"
              className="min-h-11 pl-9"
            />
            <SearchResults
              query={searchQuery}
              mobile
              onNavigate={() => {
                setSearchQuery("");
                setMobileSearchOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
