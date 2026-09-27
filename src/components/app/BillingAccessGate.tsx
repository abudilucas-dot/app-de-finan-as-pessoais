import type { ReactNode } from "react";
import { Crown, LogOut } from "lucide-react";

import { SubscriptionPlans } from "@/components/app/SubscriptionPlans";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBillingSubscription } from "@/hooks/useBillingSubscription";
import { LoadingState } from "@/components/app/states";

export function BillingAccessGate({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const billing = useBillingSubscription();

  if (billing.isLoading) {
    return <LoadingState label="Verificando seu acesso ao Valune..." />;
  }

  const hasAccess = ["beta", "trialing", "active"].includes(billing.data?.status ?? "");

  if (hasAccess) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="w-full max-w-lg rounded-3xl border border-primary/25 bg-card p-6 shadow-xl sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Crown className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          Seu acesso ainda não está liberado
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          "Conclua a compra única para liberar todos os recursos do Valune. Se você acabou de comprar, crie ou entre usando o mesmo e-mail informado no checkout."
        </p>
        <SubscriptionPlans subscription={billing.data ?? null} />
        <Button className="mt-5 w-full" variant="ghost" onClick={() => void signOut()}>
          <LogOut aria-hidden="true" />
          Sair da conta
        </Button>
      </section>
    </main>
  );
}
