import { Link, useRouterState } from "@tanstack/react-router";

import { brand } from "@/config/brand";
import { primaryNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
          {brand.initials}
        </span>
        <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
          {brand.name}
        </span>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {primaryNav.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
              {!item.ready ? (
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Em breve
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
