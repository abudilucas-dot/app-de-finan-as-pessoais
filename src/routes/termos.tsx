import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/app/LegalPage";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: `Termos de uso — ${brand.name}` },
      { name: "description", content: `Regras de uso do aplicativo ${brand.name}.` },
    ],
  }),
  component: TermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      description="Estes termos definem o uso do aplicativo de organização financeira pessoal."
      updatedAt="25 de setembro de 2026"
    >
      <Section title="1. Sobre o aplicativo">
        <p>{brand.name} é uma ferramenta de organização financeira pessoal. Ele ajuda a registrar informações fornecidas por você e a visualizar saldos, gastos, metas e compromissos.</p>
        <p>O aplicativo não é banco, instituição de pagamento, corretora nem serviço de consultoria financeira. Ele não movimenta dinheiro nem substitui orientação profissional.</p>
      </Section>

      <Section title="2. Sua conta">
        <p>Você é responsável por manter as informações da conta corretas e por proteger seu e-mail e senha. Não compartilhe o acesso com outras pessoas.</p>
        <p>Para usar recursos privados, mantenha uma conta autenticada e siga as regras de confirmação de e-mail e segurança apresentadas no aplicativo.</p>
      </Section>

      <Section title="3. Registros financeiros">
        <p>Os valores, categorias, datas e demais informações exibidos dependem dos dados inseridos por você. Confira os lançamentos antes de tomar decisões financeiras com base nos relatórios.</p>
        <p>Compras no crédito, pagamentos de fatura, transferências e parcelas seguem regras próprias de cálculo para evitar duplicidade; ainda assim, os registros devem refletir sua situação real.</p>
      </Section>

      <Section title="4. Uso adequado">
        <p>Use o serviço apenas para organizar seus próprios dados ou dados para os quais você tenha autorização. Não tente acessar contas de outras pessoas, interferir no funcionamento do app ou enviar conteúdo ilegal.</p>
      </Section>

      <Section title="5. Disponibilidade e mudanças">
        <p>O aplicativo está em evolução. Recursos podem ser ajustados, adicionados ou removidos para melhorar segurança, clareza e funcionamento. Sempre que houver uma mudança relevante nos termos, a versão atualizada será publicada nesta página.</p>
      </Section>

      <Section title="6. Teste e acesso completo">
        <p>Novas contas podem usar o Valune gratuitamente por 7 dias, sem informar cartão. Ao fim do teste, o acesso aos recursos financeiros fica bloqueado até a confirmação de uma compra.</p>
        <p>Quando oferecido no checkout, o Valune Vitalício é uma compra única, sem mensalidade ou renovação automática. O acesso completo é liberado após a confirmação segura do pagamento e permanece enquanto o Valune estiver disponível e em operação.</p>
      </Section>

      <Section title="7. Suporte">
        <p>Para ajuda sobre o aplicativo ou uma compra, escreva para <a className="font-medium text-primary hover:underline" href="mailto:abudilucas@gmail.com?subject=Suporte%20-%20Valune">abudilucas@gmail.com</a>. Nossa meta é responder em até 2 dias úteis.</p>
      </Section>

      <Section title="8. Encerramento da conta">
        <p>Você pode solicitar a exclusão definitiva da conta pelo próprio aplicativo, em Configurações. Antes de excluir, exporte seus dados se quiser guardar uma cópia.</p>
      </Section>
    </LegalPage>
  );
}
