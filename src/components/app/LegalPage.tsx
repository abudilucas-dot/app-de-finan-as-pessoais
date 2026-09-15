import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { brand } from "@/config/brand";

export function LegalPage({
  title,
  description,
  updatedAt,
  children,
}: {
  title: string;
  description: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            ← Voltar para entrar
          </Link>
          <span className="text-sm font-semibold">{brand.name}</span>
        </header>

        <article className="surface p-5 sm:p-8">
          <p className="text-sm font-medium text-primary">{brand.name}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
          <p className="mt-4 text-xs text-muted-foreground">Última atualização: {updatedAt}</p>

          <div className="mt-8 space-y-7 text-sm leading-6 text-muted-foreground">
            {children}
          </div>
        </article>

        <footer className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link to="/privacidade" className="hover:text-foreground hover:underline">Privacidade</Link>
          <Link to="/termos" className="hover:text-foreground hover:underline">Termos de uso</Link>
          <Link to="/login" className="hover:text-foreground hover:underline">Entrar</Link>
        </footer>
      </div>
    </main>
  );
}
