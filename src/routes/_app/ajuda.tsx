import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, CircleHelp, Download, Mail, MessageCircle, ReceiptText, Trash2, WalletCards } from "lucide-react";

import { PageHeader } from "@/components/app/PageHeader";
import { moduleThemes } from "@/config/moduleThemes";

export const Route = createFileRoute("/_app/ajuda")({
  head: () => ({ meta: [{ title: "Ajuda — Valune" }] }),
  component: HelpPage,
});

const topicThemes = [moduleThemes.cards, moduleThemes.support, moduleThemes.trash, moduleThemes.export] as const;

const topics = [
  {
    icon: WalletCards,
    title: "Cartões e faturas",
    text: "No crédito, a compra entra como despesa na data da compra. O pagamento da fatura não vira uma segunda despesa. No débito, a compra sai diretamente da conta vinculada.",
    to: "/cartoes",
    action: "Abrir cartões",
  },
  {
    icon: ReceiptText,
    title: "Movimentações",
    text: "Use o botão + para registrar receita, despesa ou transferência. Você pode editar ou excluir os lançamentos quando necessário.",
    to: "/transacoes",
    action: "Abrir movimentações",
  },
  {
    icon: Trash2,
    title: "Lixeira",
    text: "Movimentações excluídas podem ser restauradas por até 30 dias. Depois disso, são removidas definitivamente.",
    to: "/lixeira",
    action: "Abrir lixeira",
  },
  {
    icon: Download,
    title: "Backup dos seus dados",
    text: "Em Configurações, prepare um relatório financeiro e escolha “Salvar em Arquivos” para definir onde guardar a cópia.",
    to: "/configuracoes",
    action: "Abrir configurações",
  },
] as const;

function HelpPage() {
  const theme = moduleThemes.support;

  return (
    <div className="space-y-6">
      <PageHeader title="Ajuda e suporte" description="Encontre respostas rápidas sobre o uso do aplicativo." />

      <section className={`surface border p-5 sm:p-6 ${theme.card}`}>
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}>
            <CircleHelp className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">Comece por aqui</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estas respostas cobrem os principais fluxos do aplicativo. Se precisar, você também pode falar diretamente com o suporte.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {topics.map((topic, index) => {
          const Icon = topic.icon;
          const topicTheme = topicThemes[index]!;
          return (
            <Link key={topic.title} to={topic.to} className={`surface group flex min-h-44 flex-col border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${topicTheme.card}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${topicTheme.icon}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-semibold">{topic.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{topic.text}</p>
              <span className={`mt-auto pt-4 text-sm font-medium ${topicTheme.text}`}>
                {topic.action} <ChevronRight className="inline h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </section>

      <section className={`surface border p-5 sm:p-6 ${theme.card}`}>
        <h2 className={`font-semibold ${theme.text}`}>Ainda precisa de ajuda?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fale conosco pelo canal que preferir. Nossa meta é responder em até 2 dias úteis. Ao enviar uma mensagem, não compartilhe senha, códigos de confirmação ou dados de cartão.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            href="mailto:abudilucas@gmail.com?subject=Suporte%20-%20Valune"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Enviar e-mail
          </a>
          <a
            href="https://wa.me/5544991298462?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20aplicativo%20Valune."
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Falar pelo WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
