import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { LoadingState } from "@/components/app/states";
import { brand } from "@/config/brand";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${brand.name} — organize sua vida financeira` },
      { name: "description", content: brand.description },
      { property: "og:title", content: `${brand.name} — organize sua vida financeira` },
      { property: "og:description", content: brand.description },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/dashboard" : "/login", replace: true });
  }, [user, loading, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{brand.tagline}</p>
        <LoadingState label="Preparando seu espaço..." />
      </div>
    </main>
  );
}
