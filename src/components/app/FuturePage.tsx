import { UnderConstruction } from "@/components/app/UnderConstruction";

export function FuturePage({ title }: { title: string }) {
  return (
    <UnderConstruction
      title={title}
      description="Este módulo será conectado aos seus dados reais em uma próxima etapa."
    />
  );
}
