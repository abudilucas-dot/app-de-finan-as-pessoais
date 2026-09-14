import { Hammer } from "lucide-react";

import { EmptyState } from "@/components/app/states";
import { PageHeader } from "@/components/app/PageHeader";

export function UnderConstruction({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Hammer}
        title="Em construção"
        description="Esta área ainda não está disponível. Ela será liberada em uma próxima etapa, com dados reais."
      />
    </div>
  );
}
