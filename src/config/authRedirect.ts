/**
 * URLs canônicas para fluxos de autenticação por e-mail.
 * O retorno sempre prefere o mesmo domínio que a pessoa está usando.
 * No servidor, VITE_APP_URL (ou a URL de produção abaixo) é usada como fallback.
 */
const fallbackAppUrl = "https://app-de-finan-as-pessoais-ten.vercel.app";

export const appUrl = (import.meta.env.VITE_APP_URL || fallbackAppUrl).replace(/\/$/, "");

export function emailConfirmationRedirectUrl() {
  const currentOrigin = typeof window === "undefined" ? null : window.location.origin;
  const origin = currentOrigin && currentOrigin !== "null" ? currentOrigin : appUrl;
  return `${origin}/login?confirmed=1`;
}
