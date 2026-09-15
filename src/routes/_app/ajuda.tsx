import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, CircleHelp, Download, Mail, MessageCircle, ReceiptText, Trash2, WalletCards } from "lucide-react";

import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_app/ajuda")({
  head: () => ({ meta: [{ title: "Ajuda — Finanças" }] }),
  component: HelpPage,
});

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
  return (
    <div className="space-y-6">
      <PageHeader title="Ajuda e suporte" description="Encontre respostas rápidas sobre o uso do aplicativo." />

      <section className="surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
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
        {topics.map((topic) => {
          const Icon = topic.icon;
          return (
            <Link key={topic.title} to={topic.to} className="surface group flex min-h-44 flex-col p-5 transition-colors hover:bg-accent/50">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-semibold">{topic.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{topic.text}</p>
              <span className="mt-auto pt-4 text-sm font-medium text-primary">
                {topic.action} <ChevronRight className="inline h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="surface p-5 sm:p-6">
        <h2 className="font-semibold">Ainda precisa de ajuda?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fale conosco pelo canal que preferir. Ao enviar uma mensagem, não compartilhe senha, códigos de confirmação ou dados de cartão.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            href="mailto:abudilucas@gmail.com?subject=Suporte%20-%20Finan%C3%A7as"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Enviar e-mail
          </a>
          <a
            href="https://wa.me/5544991298462?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20aplicativo%20Finan%C3%A7as."
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
