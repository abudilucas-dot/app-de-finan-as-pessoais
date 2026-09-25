import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/app/LegalPage";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: `Política de privacidade — ${brand.name}` },
      { name: "description", content: `Como ${brand.name} trata dados pessoais e financeiros.` },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidade"
      description="Esta política explica, em linguagem simples, quais dados o aplicativo usa para funcionar e quais controles você tem sobre eles."
      updatedAt="25 de setembro de 2026"
    >
      <Section title="1. Dados usados pelo aplicativo">
        <p>Usamos os dados que você informa para criar e acessar a conta, como nome e e-mail. Para fornecer o serviço, também guardamos os dados financeiros que você registra, por exemplo contas, cartões, movimentações, metas, orçamentos, dívidas e preferências.</p>
        <p>As preferências de tema e de ocultação de valores também são armazenadas para manter a experiência escolhida por você.</p>
      </Section>

      <Section title="2. Finalidade">
        <p>Os dados são usados somente para disponibilizar a organização financeira dentro da sua conta, manter o acesso autenticado, exibir os cálculos solicitados e melhorar a confiabilidade do aplicativo.</p>
        <p>O aplicativo não vende seus dados financeiros nem utiliza os registros para publicidade personalizada.</p>
      </Section>

      <Section title="3. Armazenamento e acesso">
        <p>Os dados são processados na infraestrutura necessária ao funcionamento do produto, incluindo autenticação, banco de dados e hospedagem. O acesso aos registros do aplicativo é separado por conta autenticada.</p>
        <p>Não compartilhe sua senha. Se suspeitar de acesso indevido, altere a senha e encerre a sessão em seus dispositivos.</p>
      </Section>

      <Section title="4. Retenção e exclusão">
        <p>Os dados permanecem na conta enquanto ela estiver ativa. Movimentações excluídas ficam na Lixeira por até 30 dias para permitir restauração; depois desse prazo são removidas definitivamente.</p>
        <p>Você pode excluir a própria conta em Configurações. Essa ação é permanente e remove os dados associados conforme o fluxo apresentado no aplicativo.</p>
      </Section>

      <Section title="5. Seus controles">
        <p>Você pode consultar e editar seus registros no app, exportar uma cópia dos dados em Configurações e pedir a exclusão da conta. Esses controles ajudam a exercer direitos de acesso, correção e eliminação previstos na legislação aplicável.</p>
      </Section>

      <Section title="6. Atualizações e contato">
        <p>Esta política poderá ser atualizada quando o aplicativo mudar. A data da última atualização ficará no topo desta página.</p>
        <p>Para dúvidas ou solicitações relacionadas à privacidade, escreva para <a className="font-medium text-primary hover:underline" href="mailto:abudilucas@gmail.com?subject=Privacidade%20-%20Valune">abudilucas@gmail.com</a> ou fale pelo <a className="font-medium text-primary hover:underline" href="https://wa.me/5544991298462?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20sobre%20privacidade%20no%20aplicativo%20Valune." target="_blank" rel="noreferrer">WhatsApp</a>. Nossa meta é responder em até 2 dias úteis.</p>
      </Section>
    </LegalPage>
  );
}
