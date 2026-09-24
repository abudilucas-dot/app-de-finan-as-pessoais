export type BillingPlanCode = "pro_monthly" | "pro_annual";

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
    code: "pro_monthly",
    name: "Valune Pro Mensal",
    priceLabel: "R$ 14,90",
    cadence: "/ mês",
    detail: "Acesso completo ao Valune Pro.",
    checkoutUrl: import.meta.env.VITE_KIWIFY_PRO_MONTHLY_CHECKOUT_URL,
  },
  {
    code: "pro_annual",
    name: "Valune Pro Anual",
    priceLabel: "R$ 149,90",
    cadence: "/ ano",
    detail: "Acesso completo ao Valune Pro com economia de quase 2 meses.",
    badge: "Melhor valor",
    checkoutUrl: import.meta.env.VITE_KIWIFY_PRO_ANNUAL_CHECKOUT_URL,
  },
];

export function checkoutUrlForPlan(planCode: BillingPlanCode) {
  return billingPlans.find((plan) => plan.code === planCode)?.checkoutUrl;
}
