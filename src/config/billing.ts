export type BillingPlanCode = "lifetime";

export type BillingPlan = {
  code: BillingPlanCode;
  name: string;
  priceLabel: string;
  cadence: string;
  detail: string;
  badge?: string;
  checkoutUrl: string | undefined;
};

export const billingPlans: BillingPlan[] = [
  {
    code: "lifetime",
    name: "Valune Vitalício",
    priceLabel: "R$ 49,90",
    cadence: " pagamento único",
    detail: "Acesso completo ao Valune, sem mensalidade ou renovação.",
    badge: "Oferta de lançamento",
    checkoutUrl: import.meta.env.VITE_KIWIFY_LIFETIME_CHECKOUT_URL,
  },
];

export function checkoutUrlForPlan(planCode: BillingPlanCode) {
  return billingPlans.find((plan) => plan.code === planCode)?.checkoutUrl;
}
