import type { ReactNode } from "react";
import { ChartNoAxesCombined, ShieldCheck, Sparkles } from "lucide-react";

import { brand } from "@/config/brand";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute -left-20 top-8 h-56 w-56 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-accent/80 blur-3xl" aria-hidden="true" />
      <div className="relative w-full max-w-md">
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <span className="absolute -inset-2 rounded-[1.65rem] bg-primary/25 blur-lg" aria-hidden="true" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-primary text-2xl font-black tracking-tight text-primary-foreground shadow-float ring-4 ring-background">
              {brand.initials}
              <Sparkles className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-card p-1 text-primary shadow-sm" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{brand.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{brand.tagline}</p>
          </div>
        </div>

        <section className="surface border-border/80 bg-card/90 p-6 shadow-float backdrop-blur sm:p-7">
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
            <ChartNoAxesCombined className="h-4 w-4" aria-hidden="true" />
            Seu dinheiro, visto com clareza.
          </div>
          <header className="mb-6 space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </header>
          {children}
          <div className="mt-6 flex items-center justify-center gap-2 border-t pt-4 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Seus dados ficam protegidos.
          </div>
        </section>

        {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </main>
  );
}
