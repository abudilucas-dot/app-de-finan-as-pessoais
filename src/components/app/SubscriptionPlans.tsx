import { Check, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { billingPlans } from "@/config/billing";
import type { BillingSubscription } from "@/hooks/useBillingSubscription";

export function SubscriptionPlans({
  subscription,
}: {
  subscription: BillingSubscription | null;
}) {
  const isActive = subscription?.status === "active";
  const isBeta = subscription?.status === "beta";

  if (isBeta || isActive || subscription?.status === "trialing") return null;

  return (
    <div className="mt-5 grid gap-3">
      {billingPlans.map((plan) => {
        const hasCheckout = Boolean(plan.checkoutUrl);
        return (
          <article
            key={plan.code}
            className="relative rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background/60 to-fuchsia-500/10 p-5 shadow-sm"
          >
            {plan.badge ? (
              <span className="absolute -top-2 right-3 rounded-full bg-fuchsia-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                {plan.badge}
              </span>
            ) : null}
            <h3 className="font-semibold">{plan.name}</h3>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              {plan.priceLabel} <span className="text-sm font-medium text-muted-foreground">{plan.cadence}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{plan.detail}</p>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-4 w-4 text-positive" aria-hidden="true" />
              Compra única · acesso liberado após a confirmação do pagamento
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Acesso vitalício enquanto o Valune estiver em operação.
            </p>
            {hasCheckout ? (
              <Button asChild className="mt-4 w-full">
                <a href={plan.checkoutUrl} target="_blank" rel="noreferrer">
                  Comprar acesso vitalício
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            ) : (
              <Button className="mt-4 w-full" disabled>
                Checkout em configuração
              </Button>
            )}
          </article>
        );
      })}
      <p className="text-xs text-muted-foreground">
        A compra é processada em ambiente seguro da Kiwify. Use o mesmo e-mail cadastrado no Valune para associar seu acesso.
      </p>
    </div>
  );
}
