import type { ReactNode } from "react";

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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-float">
            {brand.initials}
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight">{brand.name}</p>
            <p className="text-sm text-muted-foreground">{brand.tagline}</p>
          </div>
        </div>

        <section className="surface p-6 sm:p-7">
          <header className="mb-6 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </header>
          {children}
        </section>

        {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </main>
  );
}
