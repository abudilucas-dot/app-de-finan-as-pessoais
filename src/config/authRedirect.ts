/**
 * URL canônica usada nos fluxos de autenticação por e-mail.
 * Previews da Vercel não devem ser usados como destino de confirmação.
 * Defina VITE_APP_URL na Vercel quando um domínio próprio for adotado.
 */
const fallbackAppUrl = "https://app-de-finan-as-pessoais-ten.vercel.app";

export const appUrl = (import.meta.env.VITE_APP_URL || fallbackAppUrl).replace(/\/$/, "");

export const emailConfirmationRedirectUrl = `${appUrl}/login?confirmed=1`;
