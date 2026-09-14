import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Eye, EyeOff, Menu, Plus, Search } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { brand } from "@/config/brand";
import { primaryNav } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return brand.initials;
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

export function AppHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const hidden = settings?.hide_values ?? false;
  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Você";

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

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          disabled
          placeholder="Pesquisar (em breve)"
          aria-label="Pesquisar"
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button asChild className="hidden md:inline-flex">
          <Link to="/transacoes" search={{ nova: true }}>
            <Plus aria-hidden="true" />
            Nova transação
          </Link>
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

        <Button variant="ghost" size="icon" aria-label="Notificações" disabled>
          <Bell className="h-5 w-5" aria-hidden="true" />
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
    </header>
  );
}
