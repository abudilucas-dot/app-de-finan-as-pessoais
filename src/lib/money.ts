export const MASKED_MONEY = "R$ ••••••";

export function formatMoney(value: number | string | null | undefined, currency = "BRL") {
  const numeric = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

/** Converte o texto digitado em um campo monetário BRL para número. */
export function parseMoneyInput(input: string): number {
  const digits = input.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}

/** Formata enquanto o usuário digita: 1234 -> "12,34". */
export function maskMoneyInput(input: string): string {
  const value = parseMoneyInput(input);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
