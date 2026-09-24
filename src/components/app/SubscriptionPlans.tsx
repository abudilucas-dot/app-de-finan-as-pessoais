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

  if (isBeta || isActive) return null;

  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-2">
      {billingPlans.map((plan) => {
        const hasCheckout = Boolean(plan.checkoutUrl);
        return (
          <article
            key={plan.code}
            className="relative rounded-2xl border bg-background/60 p-4 shadow-sm"
          >
            {plan.badge ? (
              <span className="absolute -top-2 right-3 rounded-full bg-fuchsia-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                {plan.badge}
              </span>
            ) : null}
            <h3 className="font-semibold">{plan.name}</h3>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {plan.priceLabel} <span className="text-sm font-medium text-muted-foreground">{plan.cadence}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{plan.detail}</p>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-4 w-4 text-positive" aria-hidden="true" />
              Teste grátis de 7 dias já utilizado ou em andamento
            </p>
            {hasCheckout ? (
              <Button asChild className="mt-4 w-full">
                <a href={plan.checkoutUrl} target="_blank" rel="noreferrer">
                  Assinar {plan.code === "pro_annual" ? "anual" : "mensal"}
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
      <p className="lg:col-span-2 text-xs text-muted-foreground">
        A assinatura é processada em ambiente seguro da Kiwify. Use o mesmo e-mail cadastrado no Valune para que o acesso seja associado corretamente.
      </p>
    </div>
  );
}
