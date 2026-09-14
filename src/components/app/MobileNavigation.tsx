import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeftRight, Home, MoreHorizontal, PieChart, Plus } from "lucide-react";
import { useState } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const items = [
  { label: "Início", to: "/dashboard", icon: Home },
  { label: "Transações", to: "/transacoes", icon: ArrowLeftRight },
  { label: "Relatórios", to: "/relatorios", icon: PieChart },
  { label: "Mais", to: "/mais", icon: MoreHorizontal },
];

export function MobileNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);

  const renderLink = (item: (typeof items)[number]) => {
    const active = pathname === item.to;
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        <item.icon className="h-5 w-5" aria-hidden="true" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-screen-sm items-center gap-1 px-2 py-1.5">
          {items.slice(0, 2).map(renderLink)}

          <button
            type="button"
            aria-label="Adicionar"
            onClick={() => setOpen(true)}
            className="mx-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-float transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>

          {items.slice(2).map(renderLink)}
        </div>
      </nav>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Adicionar</DrawerTitle>
            <DrawerDescription>
              As ações rápidas chegam junto com as transações. Por enquanto, cadastre suas contas.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8">
            <Link
              to="/contas"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Ir para contas
            </Link>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
